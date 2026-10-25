package com.backend.cenima.Repository;

import com.backend.cenima.Entity.Room;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RoomRepository extends JpaRepository<Room, Integer> {

    Optional<Room> findByRoomName(String roomName);

    boolean existsByRoomName(String roomName);
}
