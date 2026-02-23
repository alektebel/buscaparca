package com.buscaparca.data.database

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import com.buscaparca.data.models.ParkingEvent
import com.buscaparca.data.models.ParkingZone
import com.buscaparca.data.models.Trajectory
import com.buscaparca.data.models.User

@Database(
    entities = [
        User::class,
        ParkingZone::class,
        ParkingEvent::class,
        Trajectory::class
    ],
    version = 1,
    exportSchema = false
)
abstract class BuscaParcaDatabase : RoomDatabase() {
    abstract fun userDao(): UserDao
    abstract fun parkingZoneDao(): ParkingZoneDao
    abstract fun parkingEventDao(): ParkingEventDao
    abstract fun trajectoryDao(): TrajectoryDao

    companion object {
        @Volatile
        private var INSTANCE: BuscaParcaDatabase? = null

        fun getDatabase(context: Context): BuscaParcaDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    BuscaParcaDatabase::class.java,
                    "buscaparca_database"
                )
                    .fallbackToDestructiveMigration()
                    .build()
                INSTANCE = instance
                instance
            }
        }
    }
}
