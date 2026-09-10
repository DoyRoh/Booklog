"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import type { Group, Mesh, MeshStandardMaterial } from "three";
import type { Avatar } from "@/components/illustration";
import { spiralSlot, type SceneItem, type TreeKind } from "@/lib/forest-scene";

// 우리 숲 3D -- 배지 하나가 나무·별·등불·새·버섯 하나로 서 있는 작은 숲.
// 그림 파일이 아니라 공·원뿔·원기둥 같은 기본 도형만으로 "찰흙(클레이)"
// 느낌을 낸다: 무광(roughness 1), 팔레트 색, 둥글고 뭉툭한 실루엣, 목 없음,
// 점 눈 두 개 -- 2D 캐릭터 규칙 그대로. 나중에 진짜 3D 모델(GLB)이 생기면
// 이 파일의 각 조각만 바꿔 끼우면 된다.

export type Mood = "day" | "night";

const C = {
  paper: "#EAF0E5",
  night: "#1B2A22",
  ground: "#B9D3A3",
  groundNight: "#3B5240",
  hill: "#A9C994",
  hillNight: "#324A38",
  stone: "#E4E9DA",
  stoneNight: "#5A6B58",
  trunk: "#735838",
  leafLight: "#BFE0A6",
  leaf: "#3E9E5A",
  leafDeep: "#2E7D4A",
  pine: "#1B5E3A",
  amber: "#E8A33D",
  starY: "#F2C94C",
  berry: "#D94A32",
  cream: "#F3E9D8",
  white: "#FFFFFF",
  ink: "#26362B",
  post: "#5A4630",
  rabbit: "#F3E9D8",
  rabbitEar: "#F0C9C4",
  dog: "#C98A4B",
  cat: "#8FA3B0",
  bear: "#2A2A2E",
};

/** 무광 찰흙 재질. */
function Clay({ color, emissive, emissiveIntensity }: { color: string; emissive?: string; emissiveIntensity?: number }) {
  return (
    <meshStandardMaterial color={color} roughness={1} metalness={0} emissive={emissive ?? "#000000"} emissiveIntensity={emissiveIntensity ?? 0} />
  );
}

function Trunk({ height = 0.9, radius = 0.14 }: { height?: number; radius?: number }) {
  return (
    <mesh position-y={height / 2} castShadow receiveShadow>
      <cylinderGeometry args={[radius * 0.85, radius, height, 10]} />
      <Clay color={C.trunk} />
    </mesh>
  );
}

function Tree({ kind, scale }: { kind: TreeKind; scale: number }) {
  return (
    <group scale={scale}>
      {kind === "light" && (
        <>
          <Trunk height={0.6} radius={0.09} />
          <mesh position-y={1.05} castShadow>
            <sphereGeometry args={[0.55, 20, 16]} />
            <Clay color={C.leafLight} />
          </mesh>
        </>
      )}
      {kind === "bushy" && (
        <>
          <Trunk height={0.8} />
          <mesh position={[0, 1.25, 0]} castShadow>
            <sphereGeometry args={[0.62, 20, 16]} />
            <Clay color={C.leaf} />
          </mesh>
          <mesh position={[-0.42, 1.0, 0.18]} castShadow>
            <sphereGeometry args={[0.42, 20, 16]} />
            <Clay color={C.leafDeep} />
          </mesh>
          <mesh position={[0.4, 1.05, -0.2]} castShadow>
            <sphereGeometry args={[0.44, 20, 16]} />
            <Clay color={C.leafLight} />
          </mesh>
        </>
      )}
      {kind === "round" && (
        <>
          <Trunk height={1.0} radius={0.16} />
          <mesh position-y={1.75} castShadow>
            <sphereGeometry args={[0.85, 22, 18]} />
            <Clay color={C.leaf} />
          </mesh>
        </>
      )}
      {kind === "pine" && (
        <>
          <Trunk height={0.9} radius={0.15} />
          <mesh position-y={1.35} castShadow>
            <coneGeometry args={[0.9, 1.1, 12]} />
            <Clay color={C.pine} />
          </mesh>
          <mesh position-y={2.05} castShadow>
            <coneGeometry args={[0.7, 1.0, 12]} />
            <Clay color={C.leafDeep} />
          </mesh>
          <mesh position-y={2.65} castShadow>
            <coneGeometry args={[0.48, 0.85, 12]} />
            <Clay color={C.pine} />
          </mesh>
        </>
      )}
    </group>
  );
}

function Star({ phase, animate }: { phase: number; animate: boolean }) {
  const ref = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (!animate || !ref.current) return;
    const t = clock.getElapsedTime();
    ref.current.position.y = 2.3 + Math.sin(t * 1.4 + phase) * 0.15;
    ref.current.rotation.y = t * 0.6 + phase;
  });
  return (
    <mesh ref={ref} position-y={2.3}>
      <octahedronGeometry args={[0.3, 0]} />
      <Clay color={C.starY} emissive={C.starY} emissiveIntensity={0.7} />
    </mesh>
  );
}

function Lantern({ lit, withLight, animate, phase }: { lit: boolean; withLight: boolean; animate: boolean; phase: number }) {
  const mat = useRef<MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    if (!animate || !mat.current || !lit) return;
    mat.current.emissiveIntensity = 1.4 + Math.sin(clock.getElapsedTime() * 5 + phase) * 0.25;
  });
  return (
    <group>
      <mesh position-y={0.75} castShadow>
        <cylinderGeometry args={[0.05, 0.06, 1.5, 8]} />
        <Clay color={C.post} />
      </mesh>
      <mesh position-y={1.62}>
        <boxGeometry args={[0.34, 0.4, 0.34]} />
        <meshStandardMaterial
          color={lit ? "#FFD27A" : "#E9E2CC"}
          emissive={C.amber}
          emissiveIntensity={lit ? 0.9 : 0}
          transparent
          opacity={0.55}
          roughness={0.6}
        />
      </mesh>
      {/* 네 모서리 기둥 */}
      {[-0.15, 0.15].flatMap((x) =>
        [-0.15, 0.15].map((z) => (
          <mesh key={`${x}${z}`} position={[x, 1.62, z]}>
            <boxGeometry args={[0.04, 0.42, 0.04]} />
            <Clay color={C.post} />
          </mesh>
        ))
      )}
      <mesh position-y={1.62}>
        <sphereGeometry args={[0.12, 12, 10]} />
        <meshStandardMaterial ref={mat} color={C.amber} emissive={C.amber} emissiveIntensity={lit ? 1.4 : 0.15} roughness={1} />
      </mesh>
      <mesh position-y={1.9}>
        <coneGeometry args={[0.28, 0.2, 4]} />
        <Clay color={C.post} />
      </mesh>
      {lit && withLight && <pointLight position={[0, 1.7, 0]} color={C.amber} intensity={6} distance={7} decay={2} />}
    </group>
  );
}

function Mushroom() {
  return (
    <group>
      <mesh position-y={0.28} castShadow>
        <cylinderGeometry args={[0.16, 0.2, 0.56, 10]} />
        <Clay color={C.cream} />
      </mesh>
      <mesh position-y={0.55} castShadow>
        <sphereGeometry args={[0.45, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <Clay color={C.berry} />
      </mesh>
      {[
        [0.2, 0.82, 0.25],
        [-0.25, 0.8, 0.1],
        [0.05, 0.95, -0.22],
      ].map((p, i) => (
        <mesh key={i} position={p as [number, number, number]}>
          <sphereGeometry args={[0.07, 8, 6]} />
          <Clay color={C.white} />
        </mesh>
      ))}
    </group>
  );
}

function BirdBody({ letter }: { letter?: boolean }) {
  return (
    <group>
      <mesh castShadow>
        <sphereGeometry args={[0.3, 16, 12]} />
        <Clay color={C.white} />
      </mesh>
      <mesh position={[0.28, 0.16, 0]}>
        <sphereGeometry args={[0.19, 14, 10]} />
        <Clay color={C.white} />
      </mesh>
      <mesh position={[0.5, 0.14, 0]} rotation-z={-Math.PI / 2}>
        <coneGeometry args={[0.05, 0.22, 8]} />
        <Clay color={C.amber} />
      </mesh>
      <mesh position={[0.38, 0.22, 0.12]}>
        <sphereGeometry args={[0.03, 6, 6]} />
        <Clay color={C.ink} />
      </mesh>
      <mesh position={[0.38, 0.22, -0.12]}>
        <sphereGeometry args={[0.03, 6, 6]} />
        <Clay color={C.ink} />
      </mesh>
      <mesh position={[-0.05, 0.12, 0.28]} rotation-x={0.5}>
        <boxGeometry args={[0.42, 0.05, 0.22]} />
        <Clay color={C.white} />
      </mesh>
      <mesh position={[-0.05, 0.12, -0.28]} rotation-x={-0.5}>
        <boxGeometry args={[0.42, 0.05, 0.22]} />
        <Clay color={C.white} />
      </mesh>
      {letter && (
        <mesh position={[0.62, 0.02, 0]} rotation-x={Math.PI / 2}>
          <boxGeometry args={[0.22, 0.16, 0.02]} />
          <Clay color={C.cream} />
        </mesh>
      )}
    </group>
  );
}

function FlyingBird({ phase, animate }: { phase: number; animate: boolean }) {
  const ref = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (!animate || !ref.current) return;
    const t = clock.getElapsedTime() * 0.5 + phase;
    ref.current.position.set(Math.cos(t) * 1.6, 3.2 + Math.sin(t * 2) * 0.2, Math.sin(t) * 1.6);
    ref.current.rotation.y = -t + Math.PI / 2;
  });
  return (
    <group ref={ref} position={[1.6, 3.2, 0]}>
      <BirdBody letter />
    </group>
  );
}

/** 하늘 높이 큰 원을 그리며 나는 백로(그룹 수만큼). */
function SkyBird({ index, animate }: { index: number; animate: boolean }) {
  const ref = useRef<Group>(null);
  const radius = 5 + index * 1.3;
  const height = 4.2 + index * 0.5;
  const phase = index * 1.9;
  useFrame(({ clock }) => {
    if (!animate || !ref.current) return;
    const t = clock.getElapsedTime() * 0.22 + phase;
    ref.current.position.set(Math.cos(t) * radius, height + Math.sin(t * 2.3) * 0.25, Math.sin(t) * radius);
    ref.current.rotation.y = -t + Math.PI / 2;
  });
  return (
    <group ref={ref} position={[Math.cos(phase) * radius, height, Math.sin(phase) * radius]} rotation-y={-phase + Math.PI / 2} scale={1.15}>
      <BirdBody letter />
    </group>
  );
}

function PerchedBird() {
  return (
    <group>
      <mesh position-y={0.3} castShadow>
        <cylinderGeometry args={[0.28, 0.32, 0.6, 10]} />
        <Clay color={C.trunk} />
      </mesh>
      <group position-y={0.85}>
        <BirdBody />
      </group>
    </group>
  );
}

/** 찰흙 동물 -- 몸 공 + 머리 공 + 귀 + 점 눈 + 주둥이. 목 없음, 짧은 팔다리. */
function Animal({ kind }: { kind: Avatar | "bear" }) {
  const body = kind === "bear" ? C.bear : kind === "dog" ? C.dog : kind === "cat" ? C.cat : C.rabbit;
  const muzzle = kind === "bear" ? C.cream : kind === "dog" ? C.cream : kind === "cat" ? C.cream : C.white;
  return (
    <group>
      <mesh position-y={0.55} scale={[1, 1.1, 0.9]} castShadow>
        <sphereGeometry args={[0.5, 20, 16]} />
        <Clay color={body} />
      </mesh>
      <mesh position-y={1.28} castShadow>
        <sphereGeometry args={[0.42, 20, 16]} />
        <Clay color={body} />
      </mesh>
      {/* 짧은 팔·다리 */}
      {[-0.42, 0.42].map((x) => (
        <mesh key={`arm${x}`} position={[x, 0.7, 0.15]} castShadow>
          <sphereGeometry args={[0.15, 10, 8]} />
          <Clay color={body} />
        </mesh>
      ))}
      {[-0.22, 0.22].map((x) => (
        <mesh key={`leg${x}`} position={[x, 0.12, 0.2]} castShadow>
          <sphereGeometry args={[0.17, 10, 8]} />
          <Clay color={body} />
        </mesh>
      ))}
      {/* 주둥이 + 코 + 점 눈 */}
      <mesh position={[0, 1.18, 0.36]}>
        <sphereGeometry args={[0.17, 12, 10]} />
        <Clay color={muzzle} />
      </mesh>
      <mesh position={[0, 1.24, 0.52]}>
        <sphereGeometry args={[0.045, 8, 6]} />
        <Clay color={C.ink} />
      </mesh>
      <mesh position={[-0.15, 1.36, 0.36]}>
        <sphereGeometry args={[0.04, 8, 6]} />
        <Clay color={C.ink} />
      </mesh>
      <mesh position={[0.15, 1.36, 0.36]}>
        <sphereGeometry args={[0.04, 8, 6]} />
        <Clay color={C.ink} />
      </mesh>
      {/* 귀 */}
      {kind === "rabbit" &&
        [-0.17, 0.17].map((x) => (
          <group key={`ear${x}`} position={[x, 1.85, -0.05]} rotation-z={x < 0 ? 0.15 : -0.15}>
            <mesh castShadow>
              <capsuleGeometry args={[0.09, 0.42, 4, 10]} />
              <Clay color={C.rabbit} />
            </mesh>
            <mesh position-z={0.06} scale={[0.6, 0.8, 0.5]}>
              <capsuleGeometry args={[0.09, 0.42, 4, 10]} />
              <Clay color={C.rabbitEar} />
            </mesh>
          </group>
        ))}
      {kind === "dog" &&
        [-0.42, 0.42].map((x) => (
          <mesh key={`ear${x}`} position={[x, 1.2, -0.02]} rotation-z={x < 0 ? 0.25 : -0.25} castShadow>
            <boxGeometry args={[0.16, 0.42, 0.1]} />
            <Clay color="#A86F3A" />
          </mesh>
        ))}
      {kind === "cat" &&
        [-0.22, 0.22].map((x) => (
          <mesh key={`ear${x}`} position={[x, 1.68, -0.02]} rotation-z={x < 0 ? 0.3 : -0.3} castShadow>
            <coneGeometry args={[0.13, 0.28, 4]} />
            <Clay color={C.cat} />
          </mesh>
        ))}
      {kind === "bear" && (
        <>
          {[-0.28, 0.28].map((x) => (
            <mesh key={`ear${x}`} position={[x, 1.62, -0.02]} castShadow>
              <sphereGeometry args={[0.12, 10, 8]} />
              <Clay color={C.bear} />
            </mesh>
          ))}
          {/* 가슴의 흰 초승달 */}
          <mesh position={[0, 0.66, 0.43]} rotation={[0.25, 0, Math.PI]} scale={[0.9, 0.4, 0.3]}>
            <torusGeometry args={[0.16, 0.05, 8, 16, Math.PI]} />
            <Clay color={C.white} />
          </mesh>
        </>
      )}
    </group>
  );
}

function BearWithLantern({ mood, animate }: { mood: Mood; animate: boolean }) {
  return (
    <group>
      <Animal kind="bear" />
      <group position={[0.62, 0.05, 0.25]} scale={0.55}>
        <Lantern lit={mood === "night"} withLight={mood === "night"} animate={animate} phase={0} />
      </group>
    </group>
  );
}

/** 나선 길을 따라 놓인 납작한 징검돌. */
function Stones({ count, mood }: { count: number; mood: Mood }) {
  const stones = useMemo(() => {
    const out: [number, number][] = [];
    const steps = Math.max(4, Math.round(count * 1.6));
    for (let i = 0; i < steps; i++) {
      const s = spiralSlot(i / 1.6 - 0.6);
      out.push([s.x, s.z]);
    }
    return out;
  }, [count]);
  return (
    <>
      {stones.map(([x, z], i) => (
        <mesh key={i} position={[x, 0.03, z]} rotation-x={-Math.PI / 2} receiveShadow>
          <circleGeometry args={[0.16 + (i % 3) * 0.03, 10]} />
          <Clay color={mood === "day" ? C.stone : C.stoneNight} />
        </mesh>
      ))}
    </>
  );
}

function Hills({ mood }: { mood: Mood }) {
  const hills: [number, number, number][] = [
    [-14, 9, 5],
    [16, -6, 6],
    [-6, -17, 5.5],
    [12, 14, 4.5],
    [-19, -4, 4],
  ];
  return (
    <>
      {hills.map(([x, z, r], i) => (
        <mesh key={i} position={[x, -r * 0.55, z]} scale={[1, 0.45, 1]} receiveShadow>
          <sphereGeometry args={[r, 20, 14]} />
          <Clay color={mood === "day" ? C.hill : C.hillNight} />
        </mesh>
      ))}
    </>
  );
}

export default function Forest3D({
  items,
  avatar,
  groups = [],
  mood,
  animate,
  picked,
  onPick,
}: {
  items: SceneItem[];
  avatar: Avatar | null | undefined;
  /** 속한 그룹(숲지기)들 -- 곰과 백로가 이 수만큼(곰은 최소 1). */
  groups?: { id: string; name: string }[];
  mood: Mood;
  animate: boolean;
  picked: string | null;
  onPick: (key: string | null) => void;
}) {
  const keepers = groups.length ? groups.slice(0, 5) : [{ id: "guide", name: "길잡이" }];
  const bg = mood === "day" ? C.paper : C.night;
  // 진짜 광원은 비싸서 밤에 등불 세 개까지만 켠다(나머지는 발광 재질만).
  const litKeys = useMemo(
    () =>
      new Set(
        items
          .filter((it) => it.kind === "ornament" && it.ornament === "lantern")
          .slice(0, 3)
          .map((it) => it.key)
      ),
    [items]
  );

  const pick = (key: string) => (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onPick(key);
  };

  return (
    <Canvas
      shadows
      dpr={[1, 1.5]}
      camera={{ position: [0, 8.5, 15], fov: 46 }}
      onPointerMissed={() => onPick(null)}
      style={{ touchAction: "none" }}
    >
      <color attach="background" args={[bg]} />
      <fog attach="fog" args={[bg, 20, 44]} />

      {mood === "day" ? (
        <>
          <ambientLight intensity={0.75} />
          <hemisphereLight args={[C.paper, "#8FB57A", 0.7]} />
          <directionalLight
            position={[7, 12, 5]}
            intensity={1.6}
            castShadow
            shadow-mapSize={[1024, 1024]}
            shadow-camera-left={-18}
            shadow-camera-right={18}
            shadow-camera-top={18}
            shadow-camera-bottom={-18}
            shadow-bias={-0.0005}
          />
        </>
      ) : (
        <>
          <ambientLight intensity={0.18} />
          <hemisphereLight args={["#3A4F66", "#1B2A22", 0.35]} />
          <directionalLight position={[-6, 10, -4]} intensity={0.45} color="#9FB4D9" castShadow shadow-mapSize={[1024, 1024]} />
          <Stars radius={60} depth={20} count={600} factor={3} fade speed={animate ? 0.6 : 0} />
        </>
      )}

      {/* 땅: 넓은 원판 + 먼 언덕 */}
      <mesh rotation-x={-Math.PI / 2} position-y={0} receiveShadow>
        <circleGeometry args={[46, 64]} />
        <Clay color={mood === "day" ? C.ground : C.groundNight} />
      </mesh>
      <Hills mood={mood} />
      <Stones count={items.length} mood={mood} />

      {/* 숲길 시작에 아이와 곰 */}
      <group position={[-0.9, 0, 0.9]} rotation-y={0.5}>
        <Animal kind={avatar ?? "rabbit"} />
      </group>
      {/* 숲지기 곰: 그룹마다 한 마리, 아이 옆에서 바깥쪽으로 부채꼴. */}
      {keepers.map((g, i) => (
        <group
          key={g.id}
          position={[0.7 + i * 1.3, 0, 1.1 - i * 0.75]}
          rotation-y={-0.4 - i * 0.25}
          scale={i === 0 ? 1 : 0.92}
        >
          <BearWithLantern mood={mood} animate={animate} />
        </group>
      ))}
      {/* 숲지기마다 편지 물고 하늘을 크게 도는 백로 한 마리. */}
      {groups.slice(0, 5).map((g, i) => (
        <SkyBird key={g.id} index={i} animate={animate} />
      ))}

      {items.map((item, i) => {
        const selected = picked === item.key;
        const phase = i * 1.7;
        const withLight = mood === "night" && litKeys.has(item.key);
        return (
          <group
            key={item.key}
            position={[item.x, 0, item.z]}
            rotation-y={item.rot}
            scale={selected ? 1.18 : 1}
            onClick={pick(item.key)}
          >
            {item.kind === "tree" ? (
              <Tree kind={item.tree} scale={item.scale} />
            ) : item.ornament === "star" ? (
              <Star phase={phase} animate={animate} />
            ) : item.ornament === "lantern" ? (
              <Lantern lit={mood === "night"} withLight={withLight} animate={animate} phase={phase} />
            ) : item.ornament === "bird-letter" ? (
              <FlyingBird phase={phase} animate={animate} />
            ) : item.ornament === "bird-perched" ? (
              <PerchedBird />
            ) : (
              <Mushroom />
            )}
            {selected && (
              <mesh position-y={0.02} rotation-x={-Math.PI / 2}>
                <ringGeometry args={[0.9, 1.1, 32]} />
                <meshBasicMaterial color={C.amber} transparent opacity={0.8} />
              </mesh>
            )}
          </group>
        );
      })}

      <OrbitControls
        target={[0, 0.9, 0]}
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={6}
        maxDistance={26}
        minPolarAngle={0.35}
        maxPolarAngle={1.38}
        autoRotate={animate}
        autoRotateSpeed={0.35}
      />
    </Canvas>
  );
}
