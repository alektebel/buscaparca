"""Contrato de la API, sobre el store de demo."""

from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient

from app.main import app

EVENING = datetime(2026, 9, 3, 20, tzinfo=UTC).isoformat()
CHUECA_BBOX = {"min_lon": -3.71, "min_lat": 40.418, "max_lon": -3.690, "max_lat": 40.432}


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_health_says_which_store_is_behind(client):
    body = client.get("/health").json()
    assert body["status"] == "ok"
    assert body["city"] == "madrid"


def test_predict_returns_a_heatmap(client):
    body = client.get("/v1/predict", params={**CHUECA_BBOX, "at": EVENING}).json()

    assert len(body["segments"]) > 5
    assert 0.0 <= body["traffic_pressure"] <= 1.0
    for segment in body["segments"]:
        assert 0.0 <= segment["p_free"] <= 1.0
        assert 0.0 <= segment["confidence"] <= 1.0
        assert len(segment["geometry"]) >= 2


def test_predict_rejects_a_bbox_nobody_could_render(client):
    assert client.get("/v1/predict", params={**CHUECA_BBOX, "min_lon": -10.0}).status_code == 422


def test_predict_rejects_an_inverted_bbox(client):
    flipped = {**CHUECA_BBOX, "min_lat": 40.5, "max_lat": 40.4}
    assert client.get("/v1/predict", params=flipped).status_code == 422


def test_plan_answers_the_only_question_that_matters(client):
    body = client.post(
        "/v1/plan",
        json={"lat": 40.4245, "lon": -3.6975, "hurry": 0.5, "stay_hours": 2, "arrive_at": EVENING},
    ).json()

    assert body["steps"], "sin corredor no hay respuesta que dar"
    assert body["accept_threshold_m"] > 0
    assert body["expected_minutes"] > 0
    assert 0.0 <= body["p_street"] <= 1.0
    assert body["fallback"]["name"]
    first = body["steps"][0]
    assert first["order"] == 0
    assert first["walk_m"] >= 0
    assert isinstance(first["accept"], bool)


def test_plan_predicts_for_the_arrival_time_not_for_now(client):
    def minutes(at: str) -> float:
        return client.post(
            "/v1/plan", json={"lat": 40.4245, "lon": -3.6975, "hurry": 0.2, "arrive_at": at}
        ).json()["expected_minutes"]

    night = datetime(2026, 9, 3, 4, tzinfo=UTC).isoformat()
    assert minutes(night) < minutes(EVENING)


def test_plan_validates_hurry(client):
    response = client.post("/v1/plan", json={"lat": 40.4245, "lon": -3.6975, "hurry": 7.0})
    assert response.status_code == 422


def test_plan_far_from_any_known_street_still_answers(client):
    """En medio de la sierra no hay corredor, pero la app no puede quedarse muda."""
    body = client.post("/v1/plan", json={"lat": 40.60, "lon": -3.88, "hurry": 0.5}).json()

    assert body["steps"] == []
    assert body["fallback"]["id"] == "none"
    assert body["p_street"] == 0.0


def test_events_are_accepted_in_batches(client):
    body = client.post(
        "/v1/events",
        json={
            "events": [
                {"segment_id": "demo:calle-de-pelayo", "kind": "park", "at": EVENING},
                {
                    "segment_id": "demo:calle-de-pelayo",
                    "kind": "cruise_no_spot",
                    "at": EVENING,
                    "exposure_min": 1.5,
                },
            ]
        },
    ).json()

    assert body["accepted"] == 2


def test_events_reject_an_unknown_kind(client):
    response = client.post(
        "/v1/events",
        json={
            "events": [{"segment_id": "demo:calle-de-pelayo", "kind": "teleport", "at": EVENING}]
        },
    )
    assert response.status_code == 422


def test_events_never_take_raw_coordinates(client):
    """El ajuste al tramo se hace en el movil. Si esto acepta lat/lon, se ha roto algo."""
    response = client.post(
        "/v1/events",
        json={"events": [{"kind": "park", "at": EVENING, "lat": 40.4, "lon": -3.7}]},
    )
    assert response.status_code == 422
