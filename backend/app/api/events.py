"""POST /v1/events - lo que el movil observa.

Llega el id del tramo, nunca la traza GPS: el ajuste al tramo se hace en el telefono contra los
tramos que ya se ha descargado. Ver docs/PRIVACIDAD.md.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends

from app.api.deps import get_shared_store
from app.domain import ParkEvent
from app.schemas import EventAck, EventBatch
from app.store.base import Store

router = APIRouter(prefix="/v1", tags=["events"])


@router.post("/events", response_model=EventAck)
def record(body: EventBatch, store: Store = Depends(get_shared_store)) -> EventAck:
    accepted = store.record_events(
        [
            ParkEvent(segment_id=e.segment_id, kind=e.kind, at=e.at, exposure_min=e.exposure_min)
            for e in body.events
        ]
    )
    return EventAck(accepted=accepted)
