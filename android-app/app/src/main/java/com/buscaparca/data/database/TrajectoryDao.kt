package com.buscaparca.data.database

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.buscaparca.data.models.Trajectory

@Dao
interface TrajectoryDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(trajectory: Trajectory): Long

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(trajectories: List<Trajectory>)

    @Query("SELECT * FROM trajectories WHERE userId = :userId ORDER BY timestamp DESC LIMIT :limit")
    suspend fun getUserTrajectories(userId: String, limit: Int = 1000): List<Trajectory>

    @Query("DELETE FROM trajectories WHERE timestamp < :timestamp")
    suspend fun deleteOldTrajectories(timestamp: Long)

    @Query("SELECT COUNT(*) FROM trajectories")
    suspend fun getCount(): Int
}
