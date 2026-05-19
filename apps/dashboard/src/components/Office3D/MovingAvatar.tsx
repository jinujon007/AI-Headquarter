'use client';

import { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, Vector3 } from 'three';
import VoxelAvatar from './VoxelAvatar';
import type { AgentConfig, AgentState } from './agentsConfig';

interface Obstacle {
  position: Vector3;
  radius: number;
}

interface MovingAvatarProps {
  agent: AgentConfig;
  state: AgentState;
  officeBounds: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  };
  obstacles: Obstacle[];
  otherAvatarPositions: Map<string, Vector3>;
  onPositionUpdate: (id: string, pos: Vector3) => void;
}

export default function MovingAvatar({ 
  agent, 
  state, 
  officeBounds, 
  obstacles, 
  otherAvatarPositions,
  onPositionUpdate 
}: MovingAvatarProps) {
  const groupRef = useRef<Group>(null);
  
  // Random spawn position with no collisions
  const [initialPos] = useState(() => {
    let pos: Vector3;
    let attempts = 0;
    const minDistanceToObstacle = 1.5;

    // Up to 50 attempts to find a collision-free position
    do {
      const x = Math.random() * (officeBounds.maxX - officeBounds.minX - 2) + officeBounds.minX + 1;
      const z = Math.random() * (officeBounds.maxZ - officeBounds.minZ - 2) + officeBounds.minZ + 1;
      pos = new Vector3(x, 0.6, z);

      // Check obstacle collision
      let isFree = true;
      for (const obstacle of obstacles) {
        const distance = pos.distanceTo(obstacle.position);
        if (distance < obstacle.radius + minDistanceToObstacle) {
          isFree = false;
          break;
        }
      }

      if (isFree) break;
      attempts++;
    } while (attempts < 50);

    return pos;
  });

  const [targetPos, setTargetPos] = useState(initialPos);
  const currentPos = useRef(initialPos.clone());
  
  // Notify initial position
  useEffect(() => {
    onPositionUpdate(agent.id, initialPos.clone());
  }, []);

  // Check if a position is free (no collisions)
  const isPositionFree = (pos: Vector3): boolean => {
    const minDistanceToObstacle = 1.5;
    const minDistanceToAvatar = 1.2;

    // Check obstacle collision
    for (const obstacle of obstacles) {
      const distance = pos.distanceTo(obstacle.position);
      if (distance < obstacle.radius + minDistanceToObstacle) {
        return false;
      }
    }

    // Check avatar-to-avatar collision
    for (const [otherId, otherPos] of otherAvatarPositions.entries()) {
      if (otherId === agent.id) continue;
      const distance = pos.distanceTo(otherPos);
      if (distance < minDistanceToAvatar) {
        return false;
      }
    }

    return true;
  };

  // Change target every 5-10 seconds depending on status
  useEffect(() => {
    const getNewTarget = () => {
      let attempts = 0;
      let newPos: Vector3;

      // Up to 20 attempts to find a free position
      do {
        const x = Math.random() * (officeBounds.maxX - officeBounds.minX) + officeBounds.minX;
        const z = Math.random() * (officeBounds.maxZ - officeBounds.minZ) + officeBounds.minZ;
        newPos = new Vector3(x, 0.6, z);
        attempts++;
      } while (!isPositionFree(newPos) && attempts < 20);

      if (attempts < 20) {
        setTargetPos(newPos);
      }
    };

    const getInterval = () => {
      switch (state.status) {
        case 'idle':
          return 3000 + Math.random() * 3000; // 3-6s
        case 'working':
          return 8000 + Math.random() * 7000; // 8-15s
        case 'thinking':
          return 15000 + Math.random() * 10000; // 15-25s
        case 'error':
          return 30000; // nearly stationary
        default:
          return 10000;
      }
    };

    // First target after mount
    const timeout = setTimeout(getNewTarget, 1000);
    const interval = setInterval(getNewTarget, getInterval());
    
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [state.status]);

  // Smooth movement toward target
  useFrame((frameState, delta) => {
    if (!groupRef.current) return;

    const speed = state.status === 'idle' ? 1.5 : 0.8;
    const moveSpeed = delta * speed;

    const newPos = currentPos.current.clone().lerp(targetPos, moveSpeed);

    if (isPositionFree(newPos)) {
      currentPos.current.copy(newPos);
      groupRef.current.position.copy(currentPos.current);

      onPositionUpdate(agent.id, currentPos.current.clone());

      // Rotate toward movement direction
      const direction = new Vector3().subVectors(targetPos, currentPos.current);
      if (direction.length() > 0.1) {
        const angle = Math.atan2(direction.x, direction.z);
        groupRef.current.rotation.y = angle;
      }
    } else {
      // Collision — pick a new target
      const x = Math.random() * (officeBounds.maxX - officeBounds.minX) + officeBounds.minX;
      const z = Math.random() * (officeBounds.maxZ - officeBounds.minZ) + officeBounds.minZ;
      const newTarget = new Vector3(x, 0.6, z);
      if (isPositionFree(newTarget)) {
        setTargetPos(newTarget);
      }
    }
  });

  return (
    <group ref={groupRef} scale={3}>
      <VoxelAvatar
        agent={agent}
        position={[0, 0, 0]}
        isWorking={state.status === 'working'}
        isThinking={state.status === 'thinking'}
        isError={state.status === 'error'}
      />
    </group>
  );
}
