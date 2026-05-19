'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Sky, Environment, Text } from '@react-three/drei';
import { Suspense, useState, useEffect, useMemo } from 'react';
import { Vector3 } from 'three';
import { AGENTS, CEO_ZONE, BOARD_ROOM_ZONE } from './agentsConfig';
import type { AgentState } from './agentsConfig';
import AgentDesk from './AgentDesk';
import Floor from './Floor';
import Walls from './Walls';
import Lights from './Lights';
import AgentPanel from './AgentPanel';
import FileCabinet from './FileCabinet';
import Whiteboard from './Whiteboard';
import CoffeeMachine from './CoffeeMachine';
import PlantPot from './PlantPot';
import WallClock from './WallClock';
import FirstPersonControls from './FirstPersonControls';
import MovingAvatar from './MovingAvatar';
import { useOfficeWs } from '@/hooks/use-office-ws';
import { CeoChat } from '@/components/CeoChat';

export default function Office3D() {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [interactionModal, setInteractionModal] = useState<string | null>(null);
  const [controlMode, setControlMode] = useState<'orbit' | 'fps'>('orbit');
  const [showChat, setShowChat] = useState(false);
  const [avatarPositions, setAvatarPositions] = useState<Map<string, any>>(new Map());
  
  const ws = useOfficeWs();

  const agentStates = useMemo<Record<string, AgentState>>(() => {
    const base: Record<string, AgentState> = {
      pa: { id: 'pa', status: 'idle', model: 'ollama', tokensPerHour: 0, tasksInQueue: 0, uptime: 0 },
      dev: { id: 'dev', status: 'idle', model: 'ollama', tokensPerHour: 0, tasksInQueue: 0, uptime: 0 },
      researcher: { id: 'researcher', status: 'idle', model: 'ollama', tokensPerHour: 0, tasksInQueue: 0, uptime: 0 },
      copywriter: { id: 'copywriter', status: 'idle', model: 'ollama', tokensPerHour: 0, tasksInQueue: 0, uptime: 0 },
      analyst: { id: 'analyst', status: 'idle', model: 'ollama', tokensPerHour: 0, tasksInQueue: 0, uptime: 0 },
    };
    // Overlay live WS statuses
    for (const [id, status] of Object.entries(ws.agentStatuses)) {
      if (base[id]) base[id] = { ...base[id], status };
    }
    return base;
  }, [ws.agentStatuses]);

  const DEFAULT_STATE: AgentState = { id: '', status: 'idle', tokensPerHour: 0, tasksInQueue: 0, uptime: 0 };

  const handleDeskClick = (agentId: string) => {
    setSelectedAgent(agentId);
  };

  const handleClosePanel = () => {
    setSelectedAgent(null);
  };

  const handleFileCabinetClick = () => {
    setInteractionModal('memory');
  };

  const handleWhiteboardClick = () => {
    setInteractionModal('roadmap');
  };

  const handleCoffeeClick = () => {
    setInteractionModal('energy');
  };

  const handleCloseModal = () => {
    setInteractionModal(null);
  };

  const handleAvatarPositionUpdate = (id: string, position: any) => {
    setAvatarPositions(prev => new Map(prev).set(id, position));
  };

  // Obstacle map (furniture collision radii)
  const obstacles = [
    // Agent desks
    ...AGENTS.map(agent => ({
      position: new Vector3(agent.position[0], 0, agent.position[2]),
      radius: 1.5
    })),
    // Filing cabinet
    { position: new Vector3(-8, 0, -5), radius: 0.8 },
    // Whiteboard
    { position: new Vector3(0, 0, -8), radius: 1.5 },
    // Coffee machine
    { position: new Vector3(8, 0, -5), radius: 0.6 },
    // Plants
    { position: new Vector3(-7, 0, 6), radius: 0.5 },
    { position: new Vector3(7, 0, 6), radius: 0.5 },
    { position: new Vector3(-9, 0, 0), radius: 0.4 },
    { position: new Vector3(9, 0, 0), radius: 0.4 },
  ];

  return (
    <div className="fixed inset-0 bg-gray-900" style={{ height: '100vh', width: '100vw' }}>
      <Canvas
        camera={{ position: [0, 8, 12], fov: 60 }}
        shadows
        gl={{ antialias: true, alpha: false }}
        style={{ width: '100%', height: '100%' }}
      >
        <Suspense fallback={
          <mesh>
            <boxGeometry args={[2, 2, 2]} />
            <meshStandardMaterial color="orange" />
          </mesh>
        }>
          {/* Lighting */}
          <Lights />

          {/* Sky and environment */}
          <Sky sunPosition={[100, 20, 100]} />
          <Environment preset="sunset" />

          {/* Floor */}
          <Floor />

          {/* Walls */}
          <Walls />

          {/* CEO Corner zone marker */}
          <mesh position={[CEO_ZONE[0], 0.01, CEO_ZONE[2]]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[2.5, 2.5]} />
            <meshStandardMaterial color="#FFCC00" transparent opacity={0.12} />
          </mesh>
          <Text
            position={[CEO_ZONE[0], 0.05, CEO_ZONE[2]]}
            rotation={[-Math.PI / 2, 0, 0]}
            fontSize={0.35}
            color="#FFCC00"
            anchorX="center"
            anchorY="middle"
          >
            CEO CORNER
          </Text>

          {/* Board Room zone marker */}
          <mesh position={[BOARD_ROOM_ZONE[0], 0.01, BOARD_ROOM_ZONE[2]]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[1.8, 32]} />
            <meshStandardMaterial color="#9C27B0" transparent opacity={0.12} />
          </mesh>
          <Text
            position={[BOARD_ROOM_ZONE[0], 0.05, BOARD_ROOM_ZONE[2]]}
            rotation={[-Math.PI / 2, 0, 0]}
            fontSize={0.35}
            color="#9C27B0"
            anchorX="center"
            anchorY="middle"
          >
            BOARD ROOM
          </Text>

          {/* Agent desks */}
          {AGENTS.map((agent) => (
            <AgentDesk
              key={agent.id}
              agent={agent}
              state={agentStates[agent.id] ?? { ...DEFAULT_STATE, id: agent.id }}
              onClick={() => handleDeskClick(agent.id)}
              isSelected={selectedAgent === agent.id}
            />
          ))}

          {/* Avatares móviles */}
          {AGENTS.map((agent) => (
            <MovingAvatar
              key={`avatar-${agent.id}`}
              agent={agent}
              state={agentStates[agent.id] ?? { ...DEFAULT_STATE, id: agent.id }}
              officeBounds={{ minX: -8, maxX: 8, minZ: -7, maxZ: 7 }}
              obstacles={obstacles}
              otherAvatarPositions={avatarPositions}
              onPositionUpdate={handleAvatarPositionUpdate}
            />
          ))}

          {/* Mobiliario interactivo */}
          <FileCabinet
            position={[-8, 0, -5]}
            onClick={handleFileCabinetClick}
          />
          <Whiteboard
            position={[0, 0, -8]}
            rotation={[0, 0, 0]}
            onClick={handleWhiteboardClick}
          />
          <CoffeeMachine
            position={[8, 0.8, -5]}
            onClick={handleCoffeeClick}
          />

          {/* Decoración */}
          <PlantPot position={[-7, 0, 6]} size="large" />
          <PlantPot position={[7, 0, 6]} size="medium" />
          <PlantPot position={[-9, 0, 0]} size="small" />
          <PlantPot position={[9, 0, 0]} size="small" />
          <WallClock
            position={[0, 2.5, -8.4]}
            rotation={[0, 0, 0]}
          />

          {/* Controles de cámara */}
          {controlMode === 'orbit' ? (
            <OrbitControls
              enableDamping
              dampingFactor={0.05}
              minDistance={5}
              maxDistance={30}
              maxPolarAngle={Math.PI / 2.2}
            />
          ) : (
            <FirstPersonControls moveSpeed={5} />
          )}
        </Suspense>
      </Canvas>

      {/* Panel lateral cuando se selecciona un agente */}
      {selectedAgent && (
        <AgentPanel
          agent={AGENTS.find(a => a.id === selectedAgent)!}
          state={agentStates[selectedAgent]}
          onClose={handleClosePanel}
        />
      )}

      {/* Modal de interacciones con objetos */}
      {interactionModal && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-yellow-500 rounded-lg p-8 max-w-2xl w-full mx-4 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-yellow-400">
                {interactionModal === 'memory' && '📁 Memory Browser'}
                {interactionModal === 'roadmap' && '📋 Roadmap & Planning'}
                {interactionModal === 'energy' && '☕ Agent Energy Dashboard'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-white text-3xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="text-gray-300 space-y-4">
              {interactionModal === 'memory' && (
                <>
                  <p className="text-lg">🧠 Agent memory is stored in SQLite</p>
                  <div className="bg-gray-800 p-4 rounded border border-gray-700">
                    <p className="text-sm text-gray-400 mb-2">Quick links:</p>
                    <ul className="space-y-2">
                      <li><a href="/activity" className="text-yellow-400 hover:underline">→ Activity Feed</a></li>
                      <li><a href="/agents" className="text-yellow-400 hover:underline">→ Agent Status</a></li>
                    </ul>
                  </div>
                  <p className="text-sm text-gray-500 italic">
                    Agent memory browsing coming in v2
                  </p>
                </>
              )}

              {interactionModal === 'roadmap' && (
                <>
                  <p className="text-lg">🗺️ AI HQ — Build roadmap</p>
                  <div className="bg-gray-800 p-4 rounded border border-gray-700">
                    <p className="text-sm text-gray-400 mb-2">Active phases:</p>
                    <ul className="space-y-2">
                      <li className="flex items-center gap-2">
                        <span className="text-green-400">✓</span>
                        <span>Phase 0: Monorepo scaffold + server wired</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-yellow-400">●</span>
                        <span>Phase 1: Dashboard shows real agents (in progress)</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-gray-500">○</span>
                        <span>Phase 2: CEO chat + task flow end-to-end</span>
                      </li>
                    </ul>
                  </div>
                </>
              )}

              {interactionModal === 'energy' && (
                <>
                  <p className="text-lg">⚡ Agent activity and energy levels</p>
                  <div className="bg-gray-800 p-4 rounded border border-gray-700 space-y-3">
                    <div>
                      <p className="text-sm text-gray-400">Tokens consumed today:</p>
                      <p className="text-2xl font-bold text-yellow-400">47,000</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Active agents:</p>
                      <p className="text-2xl font-bold text-green-400">3 / 6</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">System uptime:</p>
                      <p className="text-2xl font-bold text-blue-400">12h 34m</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 italic">
                    This would show real-time agent mood/productivity metrics
                  </p>
                </>
              )}
            </div>

            <button
              onClick={handleCloseModal}
              className="mt-6 w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 rounded transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Controles UI overlay */}
      <div className="absolute top-4 left-4 bg-black/70 text-white p-4 rounded-lg backdrop-blur-sm">
        <h2 className="text-lg font-bold mb-2">🏢 The Office</h2>
        <div className="text-sm space-y-1 mb-3">
          <p><strong>Mode: {controlMode === 'orbit' ? '🖱️ Orbit' : '🎮 FPS'}</strong></p>
          {controlMode === 'orbit' ? (
            <>
              <p>🖱️ Mouse: Rotate view</p>
              <p>🔄 Scroll: Zoom</p>
              <p>👆 Click: Select</p>
            </>
          ) : (
            <>
              <p>Click to lock cursor</p>
              <p>WASD/Arrows: Move</p>
              <p>Space: Up | Shift: Down</p>
              <p>Mouse: Look | ESC: Unlock</p>
            </>
          )}
        </div>
        <button
          onClick={() => setControlMode(controlMode === 'orbit' ? 'fps' : 'orbit')}
          className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-2 px-3 rounded text-xs transition-colors"
        >
          Switch to {controlMode === 'orbit' ? 'FPS Mode' : 'Orbit Mode'}
        </button>
      </div>

      {/* CEO Chat toggle button */}
      <button
        onClick={() => setShowChat(!showChat)}
        className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-2 px-5 rounded-full text-sm transition-colors z-50 shadow-lg"
        style={{ letterSpacing: '0.02em' }}
      >
        {showChat ? 'Close Chat' : '💬 Talk to Alex'}
      </button>

      {/* CEO Chat panel */}
      {showChat && (
        <CeoChat
          messages={ws.messages}
          onClose={() => setShowChat(false)}
        />
      )}

      {/* WS status dot */}
      <div
        className="absolute top-4 right-4 flex items-center gap-1.5 text-xs bg-black/60 px-2.5 py-1.5 rounded-full"
        style={{ color: ws.connected ? '#22c55e' : '#ef4444' }}
      >
        <div className={`w-2 h-2 rounded-full ${ws.connected ? 'bg-green-500' : 'bg-red-500'}`} />
        {ws.connected ? 'Live' : 'Offline'}
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-black/70 text-white p-4 rounded-lg backdrop-blur-sm">
        <h3 className="text-sm font-bold mb-2">Estados</h3>
        <div className="text-xs space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>Working</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
            <span>Thinking</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
            <span>Idle</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span>Error</span>
          </div>
        </div>
      </div>
    </div>
  );
}
