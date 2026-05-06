import { useEffect, useRef, useState, useCallback } from "react";
import Phaser from "phaser";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, Users, Shield, Skull, Flame } from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

// ─── WORLD CONSTANTS ──────────────────────────────────────────────────────────
const WORLD_W = 16000;
const WORLD_H = 1440;
const SURFACE_GROUND = 520;
const CAVE_GROUND = 1100;
const HELL_GROUND = 1360;
const SURFACE_TOP = 0;
const CAVE_TOP = 640;
const HELL_TOP = 1220;

// ─── ZONE DEFINITIONS ─────────────────────────────────────────────────────────
type ZoneLayer = "surface" | "cave" | "hell";
interface Zone {
  name: string; x1: number; x2: number; layer: ZoneLayer;
  danger: number; bgColor: number; accent: number; boss?: string;
  bossRequired?: number; secret?: boolean;
}

const ZONES: Zone[] = [
  // SURFACE
  { name: "Bahamas City",      x1: 0,     x2: 2000,  layer: "surface", danger: 0,  bgColor: 0x0d0d2e, accent: 0x00ffff },
  { name: "Bahamas Plains",    x1: 2000,  x2: 4000,  layer: "surface", danger: 1,  bgColor: 0x0a1a0a, accent: 0x00ff88 },
  { name: "Troll Dimension",   x1: 4000,  x2: 6000,  layer: "surface", danger: 3,  bgColor: 0x1a0a1a, accent: 0xaa44ff },
  { name: "Exile Forest",      x1: 6000,  x2: 8000,  layer: "surface", danger: 3,  bgColor: 0x001a0a, accent: 0x44ff88 },
  { name: "Banned Tundra",     x1: 8000,  x2: 10000, layer: "surface", danger: 4,  bgColor: 0x0a1a2a, accent: 0x88ccff },
  { name: "Spam Swamp",        x1: 10000, x2: 12000, layer: "surface", danger: 4,  bgColor: 0x0a1a0a, accent: 0xaaff00 },
  { name: "Stream Colosseum",  x1: 12000, x2: 14000, layer: "surface", danger: 5,  bgColor: 0x1a0a00, accent: 0xff8800, boss: "dragon", bossRequired: 10 },
  { name: "🔒 Shadow Rift",    x1: 14000, x2: 16000, layer: "surface", danger: 6,  bgColor: 0x0a0a0a, accent: 0xff00ff, secret: true },
  // UNDERGROUND
  { name: "Dark Cave",         x1: 0,     x2: 5000,  layer: "cave",    danger: 3,  bgColor: 0x050510, accent: 0x6644cc },
  { name: "Ancient Dungeon",   x1: 5000,  x2: 10000, layer: "cave",    danger: 5,  bgColor: 0x100510, accent: 0xcc44aa },
  { name: "Bone Cathedral",    x1: 10000, x2: 14000, layer: "cave",    danger: 6,  bgColor: 0x100a05, accent: 0xff6622, boss: "dragon", bossRequired: 10 },
  { name: "🔒 Void Sanctum",   x1: 14000, x2: 16000, layer: "cave",    danger: 7,  bgColor: 0x050505, accent: 0xff00aa, secret: true },
  // HELL
  { name: "Lava Fields",       x1: 0,     x2: 5000,  layer: "hell",    danger: 7,  bgColor: 0x1a0000, accent: 0xff4400 },
  { name: "Demon Fortress",    x1: 5000,  x2: 10000, layer: "hell",    danger: 8,  bgColor: 0x1a0500, accent: 0xff2200 },
  { name: "Hell Gate",         x1: 10000, x2: 14000, layer: "hell",    danger: 9,  bgColor: 0x1a0000, accent: 0xff0000, boss: "dragon", bossRequired: 10 },
  { name: "🔒 Demon Core",     x1: 14000, x2: 16000, layer: "hell",    danger: 10, bgColor: 0x0a0000, accent: 0xff0055, secret: true },
];

// ─── CHARACTER CLASSES ────────────────────────────────────────────────────────
type CharClass = "Tank" | "Assassin" | "Mage" | "Ranger" | "Berserker" | "Paladin";

interface ClassData {
  hp: number; atk: number; speed: number;
  spriteKey: string; frameW: number; frameH: number; tint: number;
  skills: [string, string, string];
  desc: string; icon: string;
}

const CLASSES: Record<CharClass, ClassData> = {
  Tank:      { hp: 350, atk: 28, speed: 180, spriteKey: "knight",   frameW: 0,  frameH: 0,  tint: 0xffffff, skills: ["Shield Bash","Shockwave","Iron Fortress"],  desc: "Unstoppable iron wall", icon: "🛡️" },
  Assassin:  { hp: 170, atk: 52, speed: 280, spriteKey: "blade",    frameW: 48, frameH: 64, tint: 0xaa44ff, skills: ["Backstab","Shadow Step","Death Mark"],       desc: "Strikes from darkness",  icon: "🗡️" },
  Mage:      { hp: 190, atk: 42, speed: 200, spriteKey: "bobs",     frameW: 64, frameH: 64, tint: 0x44aaff, skills: ["Fireball","Blizzard","Arcane Nuke"],          desc: "Master of arcane arts",  icon: "🔮" },
  Ranger:    { hp: 210, atk: 36, speed: 240, spriteKey: "brawler",  frameW: 48, frameH: 48, tint: 0x44ff88, skills: ["Arrow Shot","Rain of Arrows","Eagle Strike"],  desc: "Precise ranged hunter",  icon: "🏹" },
  Berserker: { hp: 240, atk: 58, speed: 260, spriteKey: "brawler",  frameW: 48, frameH: 48, tint: 0xff4444, skills: ["Whirlwind","Bloodthirst","Berserker Rage"],   desc: "Fury beyond limits",     icon: "⚔️" },
  Paladin:   { hp: 280, atk: 32, speed: 190, spriteKey: "knight",   frameW: 0,  frameH: 0,  tint: 0xffdd44, skills: ["Holy Strike","Consecration","Divine Wrath"],  desc: "Sacred warrior of light", icon: "✨" },
};

// ─── MONSTER TYPES ────────────────────────────────────────────────────────────
type MonsterType = "troll" | "ghost" | "guard" | "spambot" | "iceling" | "slime";

interface MonsterData {
  hp: number; dmg: number; speed: number; xp: number; aggro: number;
  spriteKey: string; frameW: number; frameH: number; tint: number; scale: number;
  walkFrames: number[]; walkFps: number;
}

const MONSTERS: Record<MonsterType, MonsterData> = {
  troll:   { hp: 80,  dmg: 12, speed: 90,  xp: 20, aggro: 250, spriteKey: "metalslug", frameW: 39, frameH: 40, tint: 0x88cc44, scale: 1.4, walkFrames: [0,1,2,3],   walkFps: 8 },
  ghost:   { hp: 100, dmg: 18, speed: 70,  xp: 30, aggro: 300, spriteKey: "ghost",     frameW: 96, frameH: 96, tint: 0xaaaaff, scale: 0.7, walkFrames: [0],         walkFps: 1 },
  guard:   { hp: 160, dmg: 20, speed: 80,  xp: 50, aggro: 280, spriteKey: "metalslug", frameW: 39, frameH: 40, tint: 0x4488cc, scale: 1.6, walkFrames: [0,1,2,3],   walkFps: 8 },
  spambot: { hp: 60,  dmg: 8,  speed: 140, xp: 15, aggro: 220, spriteKey: "ghost1",    frameW: 41, frameH: 50, tint: 0xaaff44, scale: 0.9, walkFrames: [0,1,2,3,4], walkFps: 12 },
  iceling: { hp: 90,  dmg: 14, speed: 60,  xp: 25, aggro: 260, spriteKey: "ghost1",    frameW: 41, frameH: 50, tint: 0x88ddff, scale: 1.0, walkFrames: [0,1,2,3,4], walkFps: 6 },
  slime:   { hp: 50,  dmg: 6,  speed: 80,  xp: 12, aggro: 180, spriteKey: "slime",     frameW: 48, frameH: 52, tint: 0x44ff88, scale: 1.0, walkFrames: [0],         walkFps: 1 },
};

// ─── ENEMY SPAWN TABLE ────────────────────────────────────────────────────────
interface SpawnEntry { type: MonsterType; x: number; layer: ZoneLayer; }
const ENEMY_SPAWNS: SpawnEntry[] = [];
const BOSS_ROOMS: { x1: number; x2: number; layer: ZoneLayer; zone: Zone }[] = [];

function buildSpawnTable() {
  ENEMY_SPAWNS.length = 0;
  BOSS_ROOMS.length = 0;
  const add = (type: MonsterType, x: number, layer: ZoneLayer) =>
    ENEMY_SPAWNS.push({ type, x, layer });

  // Surface spawns
  for (let x = 2400; x < 4000; x += 400) add("troll",   x, "surface");
  for (let x = 3000; x < 4000; x += 500) add("slime",   x, "surface");
  for (let x = 4200; x < 6000; x += 380) add("troll",   x, "surface");
  for (let x = 4600; x < 6000; x += 600) add("ghost",   x, "surface");
  for (let x = 6200; x < 8000; x += 420) add("guard",   x, "surface");
  for (let x = 6800; x < 8000; x += 550) add("ghost",   x, "surface");
  for (let x = 8200; x < 10000; x += 380) add("iceling", x, "surface");
  for (let x = 8800; x < 10000; x += 500) add("slime",   x, "surface");
  for (let x = 10200; x < 12000; x += 350) add("spambot", x, "surface");
  for (let x = 10700; x < 12000; x += 480) add("troll",   x, "surface");
  for (let x = 14200; x < 16000; x += 300) add("guard",   x, "surface");
  for (let x = 14500; x < 16000; x += 420) add("ghost",   x, "surface");

  // Cave spawns
  for (let x = 400; x < 5000; x += 350)  add("ghost",   x, "cave");
  for (let x = 800; x < 5000; x += 500)  add("troll",   x, "cave");
  for (let x = 5200; x < 10000; x += 320) add("guard",   x, "cave");
  for (let x = 5800; x < 10000; x += 480) add("iceling", x, "cave");
  for (let x = 10200; x < 14000; x += 300) add("spambot", x, "cave");
  for (let x = 14200; x < 16000; x += 280) add("ghost",   x, "cave");
  for (let x = 14500; x < 16000; x += 380) add("guard",   x, "cave");

  // Hell spawns (hardest)
  for (let x = 400; x < 5000; x += 280)  add("guard",   x, "hell");
  for (let x = 600; x < 5000; x += 400)  add("troll",   x, "hell");
  for (let x = 5200; x < 10000; x += 250) add("iceling", x, "hell");
  for (let x = 5500; x < 10000; x += 350) add("spambot", x, "hell");
  for (let x = 10200; x < 14000; x += 220) add("guard",   x, "hell");
  for (let x = 14200; x < 16000; x += 200) add("troll",   x, "hell");

  // Boss rooms
  for (const z of ZONES) {
    if (z.boss) BOSS_ROOMS.push({ x1: z.x1, x2: z.x2, layer: z.layer, zone: z });
  }
}
buildSpawnTable();

// ─── BREAKDOWN WALLS (secret areas) ───────────────────────────────────────────
interface BreakWall { x: number; y: number; layer: ZoneLayer; hitsLeft: number; revealX: number; revealY: number; }
const BREAK_WALLS: BreakWall[] = [
  { x: 5800, y: SURFACE_GROUND - 80, layer: "surface", hitsLeft: 5, revealX: 6200, revealY: SURFACE_GROUND - 40 },
  { x: 9950, y: SURFACE_GROUND - 80, layer: "surface", hitsLeft: 5, revealX: 10200, revealY: SURFACE_GROUND - 40 },
  { x: 13950, y: SURFACE_GROUND - 80, layer: "surface", hitsLeft: 5, revealX: 14100, revealY: SURFACE_GROUND - 40 },
  { x: 4900, y: CAVE_GROUND - 80, layer: "cave", hitsLeft: 5, revealX: 5200, revealY: CAVE_GROUND - 40 },
  { x: 13950, y: CAVE_GROUND - 80, layer: "cave", hitsLeft: 5, revealX: 14100, revealY: CAVE_GROUND - 40 },
  { x: 13950, y: HELL_GROUND - 80, layer: "hell", hitsLeft: 5, revealX: 14100, revealY: HELL_GROUND - 40 },
];

// ─── DIVE PITS (surface → cave transitions) ────────────────────────────────────
interface DivePit { x: number; w: number; fromLayer: ZoneLayer; toLayer: ZoneLayer; toX: number; }
const DIVE_PITS: DivePit[] = [
  { x: 3200, w: 160, fromLayer: "surface", toLayer: "cave", toX: 3200 },
  { x: 7200, w: 160, fromLayer: "surface", toLayer: "cave", toX: 7200 },
  { x: 11000, w: 160, fromLayer: "surface", toLayer: "cave", toX: 11000 },
  { x: 4000, w: 160, fromLayer: "cave",    toLayer: "hell",  toX: 4000 },
  { x: 9000, w: 160, fromLayer: "cave",    toLayer: "hell",  toX: 9000 },
];

// ─── MODULE INIT STATE (passed from React to Phaser scene) ───────────────────
let _sceneInitData: {
  playerClass: CharClass;
  username: string;
  onPlayerDied: () => void;
  onZoneChange: (z: string) => void;
  onStatsUpdate: (hp: number, maxHp: number, mp: number, maxMp: number, xp: number, level: number, kills: number, layer: ZoneLayer) => void;
  onBossLock: (needed: number, have: number, zone: string) => void;
  onBossUnlock: () => void;
  onlineCount: number;
} | null = null;

// ─── PHASER SCENE ─────────────────────────────────────────────────────────────
interface EnemyData {
  sprite: Phaser.Physics.Arcade.Sprite;
  hpBar: Phaser.GameObjects.Graphics;
  maxHp: number; hp: number; dmg: number; speed: number; xp: number;
  state: "patrol" | "aggro" | "attack" | "dead";
  patrolDir: number; patrolTimer: number; attackCooldown: number;
  type: MonsterType; layer: ZoneLayer; aggroRange: number;
}

interface BossData {
  sprite: Phaser.Physics.Arcade.Sprite;
  hpBar: Phaser.GameObjects.Graphics; hpBarBg: Phaser.GameObjects.Graphics;
  hp: number; maxHp: number; phase: number; alive: boolean;
  attackTimer: number; moveDir: number; zone: Zone;
}

interface BreakWallObj {
  def: BreakWall;
  rect: Phaser.Physics.Arcade.Image;
  gfx: Phaser.GameObjects.Graphics;
  hitsLeft: number;
}

class OGWorldScene extends Phaser.Scene {
  // Player
  private player!: Phaser.Physics.Arcade.Sprite;
  private playerClass!: ClassData;
  private playerHp = 0; private playerMaxHp = 0;
  private playerMp = 0; private playerMaxMp = 100;
  private playerXp = 0; private playerLevel = 1; private playerKills = 0;
  private playerLayer: ZoneLayer = "surface";
  private attackCooldown = 0; private skillCooldowns = [0, 0, 0];
  private isAlive = true; private respawnTimer = 0;
  private invincible = 0;
  private projectiles!: Phaser.Physics.Arcade.Group;

  // Enemies
  private enemies: EnemyData[] = [];
  private bosses: BossData[] = [];
  private breakWalls: BreakWallObj[] = [];
  private bossGates: Map<string, Phaser.GameObjects.Graphics> = new Map();
  private bossGateTexts: Map<string, Phaser.GameObjects.Text> = new Map();
  private bossLockTimer = 0; private nearBossRoom = false;

  // World
  private groundSurface!: Phaser.Physics.Arcade.StaticGroup;
  private groundCave!: Phaser.Physics.Arcade.StaticGroup;
  private groundHell!: Phaser.Physics.Arcade.StaticGroup;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private caveReturnPortals!: Phaser.Physics.Arcade.StaticGroup;
  private hellReturnPortals!: Phaser.Physics.Arcade.StaticGroup;

  // Visual layers (parallax)
  private bgSky!: Phaser.GameObjects.TileSprite;
  private bgFar!: Phaser.GameObjects.TileSprite;
  private bgMid!: Phaser.GameObjects.TileSprite;
  private caveBgGroup!: Phaser.GameObjects.Group;
  private hellBgGroup!: Phaser.GameObjects.Group;

  // UI
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: { up: Phaser.Input.Keyboard.Key; down: Phaser.Input.Keyboard.Key; left: Phaser.Input.Keyboard.Key; right: Phaser.Input.Keyboard.Key; };
  private shiftKey!: Phaser.Input.Keyboard.Key;
  private fKey!: Phaser.Input.Keyboard.Key;
  private qKey!: Phaser.Input.Keyboard.Key;
  private eKey!: Phaser.Input.Keyboard.Key;
  private rKey!: Phaser.Input.Keyboard.Key;
  private zoneLabel!: Phaser.GameObjects.Text;
  private layerLabel!: Phaser.GameObjects.Text;
  private damageNumbers: { text: Phaser.GameObjects.Text; vy: number; life: number }[] = [];
  private floatingTexts: { text: Phaser.GameObjects.Text; vy: number; life: number }[] = [];
  private respawnText!: Phaser.GameObjects.Text;
  private coins!: Phaser.Physics.Arcade.Group;

  // Callbacks
  private onPlayerDied!: () => void;
  private onZoneChange!: (z: string) => void;
  private onStatsUpdate!: (hp: number, maxHp: number, mp: number, maxMp: number, xp: number, level: number, kills: number, layer: ZoneLayer) => void;
  private onBossLock!: (needed: number, have: number, zone: string) => void;
  private onBossUnlock!: () => void;
  private onlineCount = 0;

  constructor() { super({ key: "OGWorldScene" }); }

  preload() {
    // Characters
    // Only knight and blade actually exist at the phaserjs CDN animations path
    const CDN = "https://raw.githubusercontent.com/phaserjs/examples/master/public/assets";
    this.load.multiatlas("knight", `${CDN}/animations/knight.json`, `${CDN}/animations/`);
    this.load.spritesheet("blade", `${CDN}/animations/blade.png`, { frameWidth: 48, frameHeight: 64 });

    // Fallback for CDN sprites that fail — coloured rect so knight/blade still work
    this.load.on("loaderror", (file: { key: string; type: string }) => {
      const key = file.key;
      if (this.textures.exists(key)) return;
      const colors: Record<string, number> = { knight: 0x00ccff, blade: 0xaa44ff };
      const col = colors[key] ?? 0xffffff;
      const g = this.make.graphics({ add: false } as never);
      g.fillStyle(col, 1); g.fillRect(0, 0, 48, 48);
      g.generateTexture(key, 48, 48); g.destroy();
    });
    // All other sprites are generated procedurally in buildProceduralTextures()
  }

  // Called at start of create() — generate all programmatic textures
  private buildProceduralTextures() {
    const gfx = (w: number, h: number, draw: (g: Phaser.GameObjects.Graphics) => void, key: string) => {
      if (this.textures.exists(key)) return;
      const g = this.make.graphics({ add: false } as never);
      draw(g); g.generateTexture(key, w, h); g.destroy();
    };

    // Ghost — translucent white blob
    gfx(64, 64, (g) => {
      g.fillStyle(0xaaaaff, 0.85); g.fillEllipse(32, 28, 44, 52);
      g.fillStyle(0xffffff, 0.6); g.fillEllipse(24, 22, 14, 14);
      g.fillStyle(0x3333aa, 1); g.fillEllipse(22, 26, 8, 8); g.fillEllipse(40, 26, 8, 8);
    }, "ghost");

    // Slime — green blob
    gfx(48, 48, (g) => {
      g.fillStyle(0x44ff88, 0.9); g.fillEllipse(24, 28, 42, 36);
      g.fillStyle(0x88ffaa, 0.6); g.fillEllipse(18, 20, 12, 12);
      g.fillStyle(0x002200, 1); g.fillEllipse(17, 24, 6, 6); g.fillEllipse(29, 24, 6, 6);
    }, "slime");

    // Coin — yellow circle (single frame, no animation needed — bob tween handles it)
    gfx(32, 32, (g) => {
      g.fillStyle(0xffcc00, 1); g.fillCircle(16, 16, 14);
      g.fillStyle(0xffee88, 0.7); g.fillCircle(12, 12, 6);
      g.fillStyle(0xaa8800, 0.4); g.fillCircle(20, 20, 5);
    }, "coin_spin");

    // Arrow — thin white horizontal arrow
    gfx(24, 8, (g) => {
      g.fillStyle(0xffffff, 1);
      g.fillRect(0, 3, 18, 2);
      g.fillTriangle(16, 0, 24, 4, 16, 8);
    }, "arrow");

    // Gem — pink/purple diamond
    gfx(24, 24, (g) => {
      g.fillStyle(0xff44cc, 1);
      g.fillTriangle(12, 0, 24, 10, 12, 24);
      g.fillTriangle(12, 0, 0,  10, 12, 24);
      g.fillStyle(0xff88ee, 0.6); g.fillTriangle(12, 2, 20, 10, 12, 20);
    }, "gem");

    // Dragon boss — large red winged shape (96×64 single frame)
    gfx(96, 64, (g) => {
      g.fillStyle(0xcc2200, 1); g.fillRect(20, 22, 56, 24);       // body
      g.fillStyle(0xff4400, 0.85);
      g.fillTriangle(0, 32, 28, 8, 28, 32);                       // left wing
      g.fillTriangle(96, 32, 68, 8, 68, 32);                      // right wing
      g.fillStyle(0x881100, 1); g.fillRect(68, 24, 22, 20);       // head
      g.fillStyle(0xff8800, 1); g.fillRect(88, 28, 8, 4);         // snout
      g.fillStyle(0xffee00, 1); g.fillCircle(75, 28, 4);          // eye
      g.fillStyle(0x550000, 1); g.fillCircle(75, 28, 2);
      g.fillStyle(0x661100, 1); g.fillTriangle(20, 30, 12, 18, 8, 34); // tail spike
    }, "dragon");

    // Explosion — orange/white burst (single frame, used via scale tween)
    gfx(64, 64, (g) => {
      g.fillStyle(0xff6600, 0.9); g.fillCircle(32, 32, 28);
      g.fillStyle(0xffaa00, 0.8); g.fillCircle(32, 32, 20);
      g.fillStyle(0xffee44, 0.7); g.fillCircle(32, 32, 12);
      g.fillStyle(0xffffff, 0.9); g.fillCircle(32, 32, 5);
    }, "explosion");

    // Animated spritesheets for sprites that don't exist on CDN
    // Mage (bobs) — blue robed figure, 64×64, 10 cols × 10 rows
    this.makeProcSpritesheet("bobs",     64, 64, 10, 10, 0x2244cc, 0x88aaff);
    // Ranger/Berserker (brawler) — green fighter, 48×48, 5 cols × 8 rows
    this.makeProcSpritesheet("brawler",  48, 48,  5,  8, 0x116633, 0x44ff88);
    // Troll/Guard (metalslug) — stocky monster, 39×40, 4 cols × 4 rows
    this.makeProcSpritesheet("metalslug",39, 40,  4,  4, 0x226611, 0x88cc44);
    // Spambot/Iceling (ghost1) — wispy ghost, 41×50, 5 cols × 6 rows
    this.makeProcSpritesheet("ghost1",   41, 50,  5,  6, 0x334466, 0xaaddff);
  }

  // Generate an animated spritesheet procedurally and register per-frame data
  // so Phaser's generateFrameNumbers() works correctly on it.
  private makeProcSpritesheet(
    key: string, fw: number, fh: number, cols: number, rows: number,
    bodyColor: number, accentColor: number
  ) {
    if (this.textures.exists(key)) return;
    const W = fw * cols, H = fh * rows;
    const g = this.make.graphics({ add: false } as never);

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const frame = row * cols + col;
        const ox = col * fw, oy = row * fh;
        const cx = ox + fw * 0.5;

        // Walk cycle — legs alternate every 2 frames
        const legA = (frame % 4 < 2) ? 3 : 0;
        const legB = (frame % 4 < 2) ? 0 : 3;
        const bobY = (frame % 2) * 1;                 // body bob
        const headW = Math.round(fw * 0.45);
        const headH = Math.round(fh * 0.28);
        const bodyH = Math.round(fh * 0.32);
        const legH  = Math.round(fh * 0.28);
        const headX = cx - headW * 0.5;
        const headY = oy + 1 + bobY;
        const bodyY = headY + headH;
        const legTop = bodyY + bodyH;

        // Body & head
        g.fillStyle(bodyColor, 1);
        g.fillRect(headX, headY, headW, headH);
        g.fillRect(cx - fw * 0.35, bodyY, fw * 0.7, bodyH + bobY);

        // Accent stripe on body
        g.fillStyle(accentColor, 0.55);
        g.fillRect(cx - fw * 0.18, bodyY + 2, fw * 0.36, Math.round(bodyH * 0.4));

        // Eyes
        g.fillStyle(0xffffff, 0.9);
        g.fillRect(cx - headW * 0.3, headY + Math.round(headH * 0.35), 3, 3);
        g.fillRect(cx + headW * 0.1, headY + Math.round(headH * 0.35), 3, 3);
        g.fillStyle(0x111111, 1);
        g.fillRect(cx - headW * 0.25, headY + Math.round(headH * 0.4), 2, 2);
        g.fillRect(cx + headW * 0.15, headY + Math.round(headH * 0.4), 2, 2);

        // Legs
        g.fillStyle(bodyColor, 0.75);
        g.fillRect(cx - fw * 0.32, legTop, Math.round(fw * 0.28), legH + legA);
        g.fillRect(cx + fw * 0.04, legTop, Math.round(fw * 0.28), legH + legB);

        // Feet (accent)
        g.fillStyle(accentColor, 0.6);
        g.fillRect(cx - fw * 0.34, legTop + legH + legA - 3, Math.round(fw * 0.3), 4);
        g.fillRect(cx + fw * 0.02, legTop + legH + legB - 3, Math.round(fw * 0.3), 4);
      }
    }

    g.generateTexture(key, W, H);
    g.destroy();

    // Register individual frame rects so generateFrameNumbers() resolves correctly
    const tex = this.textures.get(key);
    for (let i = 0; i < cols * rows; i++) {
      const c = i % cols, r = Math.floor(i / cols);
      tex.add(i, 0, c * fw, r * fh, fw, fh);
    }
  }

  create() {
    const init = _sceneInitData!;
    this.onPlayerDied  = init.onPlayerDied;
    this.onZoneChange  = init.onZoneChange;
    this.onStatsUpdate = init.onStatsUpdate;
    this.onBossLock    = init.onBossLock;
    this.onBossUnlock  = init.onBossUnlock;
    this.onlineCount   = init.onlineCount;
    this.playerClass   = CLASSES[init.playerClass];
    this.playerMaxHp   = this.playerClass.hp;
    this.playerHp      = this.playerMaxHp;
    this.playerMp      = 100;

    // World bounds
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);

    // Generate programmatic textures BEFORE animations
    this.buildProceduralTextures();

    // Build everything
    this.buildAnimations();
    this.buildBackgrounds();
    this.buildWorld();
    this.buildPits();
    this.buildPortals();
    this.buildBreakWalls();
    this.buildBossGates();
    this.buildDecorations();
    this.spawnCoins();
    this.spawnEnemies();
    this.buildPlayer(init.playerClass);
    this.buildInput();
    this.buildUI();

    // Camera
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);

    // Collisions
    this.physics.add.collider(this.player, this.groundSurface);
    this.physics.add.collider(this.player, this.groundCave);
    this.physics.add.collider(this.player, this.groundHell);
    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.overlap(this.player, this.caveReturnPortals, this.useCavePortal, undefined, this);
    this.physics.add.overlap(this.player, this.hellReturnPortals, this.useHellPortal, undefined, this);
    this.physics.add.overlap(this.player, this.coins, this.collectCoin, undefined, this);

    // Mouse click attack
    this.input.on("pointerdown", (_ptr: Phaser.Input.Pointer) => { this.doAttack(); });
  }

  // ─── BUILD ANIMATIONS ────────────────────────────────────────────────────────
  private hasTexture(key: string): boolean {
    return this.textures.exists(key) && this.textures.get(key).key !== "__MISSING";
  }

  private buildAnimations() {
    const anims = this.anims;
    const safe = (key: string) => this.hasTexture(key);

    // Knight (multiatlas) — only if atlas loaded properly
    if (safe("knight")) {
      if (!anims.exists("knight-idle"))
        anims.create({ key: "knight-idle",   frames: anims.generateFrameNames("knight", { prefix: "idle/frame", start: 1, end: 6,  zeroPad: 4 }), frameRate: 8,  repeat: -1 });
      if (!anims.exists("knight-run"))
        anims.create({ key: "knight-run",    frames: anims.generateFrameNames("knight", { prefix: "run/frame",  start: 1, end: 8,  zeroPad: 4 }), frameRate: 12, repeat: -1 });
      if (!anims.exists("knight-attack"))
        anims.create({ key: "knight-attack", frames: anims.generateFrameNames("knight", { prefix: "attack_A/frame", start: 1, end: 14, zeroPad: 4 }), frameRate: 18, repeat: 0 });
      if (!anims.exists("knight-die"))
        anims.create({ key: "knight-die",    frames: anims.generateFrameNames("knight", { prefix: "die/frame",  start: 1, end: 10, zeroPad: 4 }), frameRate: 10, repeat: 0 });
    }

    // Blade (Assassin) - 12 cols × 9 rows @ 48x64
    if (safe("blade")) {
      if (!anims.exists("blade-idle"))
        anims.create({ key: "blade-idle",   frames: anims.generateFrameNumbers("blade", { start: 0, end: 5 }),   frameRate: 8,  repeat: -1 });
      if (!anims.exists("blade-run"))
        anims.create({ key: "blade-run",    frames: anims.generateFrameNumbers("blade", { start: 12, end: 23 }), frameRate: 12, repeat: -1 });
      if (!anims.exists("blade-attack"))
        anims.create({ key: "blade-attack", frames: anims.generateFrameNumbers("blade", { start: 24, end: 35 }), frameRate: 18, repeat: 0 });
    }

    // Bobs (Mage) - 10 cols × 10 rows @ 64x64
    if (safe("bobs")) {
      if (!anims.exists("bobs-idle"))
        anims.create({ key: "bobs-idle",   frames: anims.generateFrameNumbers("bobs", { start: 0,  end: 9  }), frameRate: 8,  repeat: -1 });
      if (!anims.exists("bobs-run"))
        anims.create({ key: "bobs-run",    frames: anims.generateFrameNumbers("bobs", { start: 10, end: 19 }), frameRate: 12, repeat: -1 });
      if (!anims.exists("bobs-attack"))
        anims.create({ key: "bobs-attack", frames: anims.generateFrameNumbers("bobs", { start: 20, end: 29 }), frameRate: 16, repeat: 0 });
    }

    // Brawler (Ranger/Berserker) - 5 cols × 8 rows @ 48x48
    if (safe("brawler")) {
      if (!anims.exists("brawler-idle"))
        anims.create({ key: "brawler-idle",   frames: anims.generateFrameNumbers("brawler", { start: 0, end: 4 }),  frameRate: 8,  repeat: -1 });
      if (!anims.exists("brawler-run"))
        anims.create({ key: "brawler-run",    frames: anims.generateFrameNumbers("brawler", { start: 5, end: 14 }), frameRate: 12, repeat: -1 });
      if (!anims.exists("brawler-attack"))
        anims.create({ key: "brawler-attack", frames: anims.generateFrameNumbers("brawler", { start: 15, end: 24 }), frameRate: 16, repeat: 0 });
    }

    // Metalslug monster - 4×4 @ 39x40
    if (safe("metalslug")) {
      if (!anims.exists("metalslug-walk"))
        anims.create({ key: "metalslug-walk",   frames: anims.generateFrameNumbers("metalslug", { start: 0, end: 3 }),  frameRate: 8,  repeat: -1 });
      if (!anims.exists("metalslug-attack"))
        anims.create({ key: "metalslug-attack", frames: anims.generateFrameNumbers("metalslug", { start: 4, end: 7 }),  frameRate: 10, repeat: 0 });
      if (!anims.exists("metalslug-die"))
        anims.create({ key: "metalslug-die",    frames: anims.generateFrameNumbers("metalslug", { start: 8, end: 15 }), frameRate: 10, repeat: 0 });
    }

    // Ghost1 - 5×6 @ 41x50
    if (safe("ghost1") && !anims.exists("ghost1-walk"))
      anims.create({ key: "ghost1-walk", frames: anims.generateFrameNumbers("ghost1", { start: 0, end: 4 }), frameRate: 8, repeat: -1 });

    // Dragon boss - 6×2 @ 96x64
    if (safe("dragon")) {
      if (!anims.exists("dragon-fly"))
        anims.create({ key: "dragon-fly",    frames: anims.generateFrameNumbers("dragon", { start: 0, end: 5 }),  frameRate: 8,  repeat: -1 });
      if (!anims.exists("dragon-attack"))
        anims.create({ key: "dragon-attack", frames: anims.generateFrameNumbers("dragon", { start: 6, end: 11 }), frameRate: 10, repeat: 0 });
    }

    // Explosion
    if (safe("explosion") && !anims.exists("explode"))
      anims.create({ key: "explode", frames: anims.generateFrameNumbers("explosion", { start: 0, end: 24 }), frameRate: 24, repeat: 0, hideOnComplete: true });

    // Coin — single programmatic frame, no animation needed (bob tween handles visual movement)
  }

  // ─── BUILD BACKGROUNDS ───────────────────────────────────────────────────────
  private buildBackgrounds() {
    // Surface sky - procedural
    const skyTex = this.generateSkyTexture();
    this.bgSky = this.add.tileSprite(0, 0, WORLD_W, CAVE_TOP, skyTex).setOrigin(0, 0).setScrollFactor(0.1, 0.05).setDepth(0);

    const farTex = this.generateCityFar();
    this.bgFar = this.add.tileSprite(0, 80, WORLD_W, 400, farTex).setOrigin(0, 0).setScrollFactor(0.25, 0).setDepth(1);

    const midTex = this.generateCityMid();
    this.bgMid = this.add.tileSprite(0, 200, WORLD_W, 400, midTex).setOrigin(0, 0).setScrollFactor(0.5, 0).setDepth(2);

    // Cave background (repeating stone pattern)
    this.caveBgGroup = this.add.group();
    const caveTex = this.generateCaveBg();
    for (let x = 0; x < WORLD_W; x += 512) {
      const bg = this.add.image(x, CAVE_TOP + 50, caveTex).setOrigin(0, 0).setDepth(0).setAlpha(0.6);
      this.caveBgGroup.add(bg);
    }

    // Hell background (lava glow)
    this.hellBgGroup = this.add.group();
    const hellTex = this.generateHellBg();
    for (let x = 0; x < WORLD_W; x += 512) {
      const bg = this.add.image(x, HELL_TOP + 10, hellTex).setOrigin(0, 0).setDepth(0).setAlpha(0.7);
      this.hellBgGroup.add(bg);
    }
  }

  private generateSkyTexture(): string {
    const key = "_ogw_sky";
    if (this.textures.exists(key)) return key;
    const g = this.make.graphics({ add: false } as any);
    // Retrowave gradient sky
    for (let y = 0; y < 580; y++) {
      const t = y / 580;
      const r = Math.floor(Phaser.Math.Linear(8, 30, t));
      const gr = Math.floor(Phaser.Math.Linear(8, 8, t));
      const b = Math.floor(Phaser.Math.Linear(50, 20, t));
      g.fillStyle(Phaser.Display.Color.GetColor(r, gr, b), 1);
      g.fillRect(0, y, 512, 1);
    }
    // Retrowave sun
    g.fillStyle(0xff6600, 1); g.fillCircle(256, 200, 80);
    g.fillStyle(0x0d0d2e, 1);
    for (let i = 0; i < 8; i++) g.fillRect(150, 195 + i * 12, 212, 6);
    // Stars
    g.fillStyle(0xffffff, 1);
    for (let i = 0; i < 120; i++) {
      const sx = Phaser.Math.Between(0, 511); const sy = Phaser.Math.Between(0, 180);
      g.fillRect(sx, sy, i % 5 === 0 ? 2 : 1, i % 5 === 0 ? 2 : 1);
    }
    g.generateTexture(key, 512, 580); g.destroy(); return key;
  }

  private generateCityFar(): string {
    const key = "_ogw_far";
    if (this.textures.exists(key)) return key;
    const g = this.make.graphics({ add: false } as any);
    g.fillStyle(0x000000, 0); g.fillRect(0, 0, 512, 400);
    const bldColors = [0x112244, 0x221144, 0x112211];
    for (let i = 0; i < 18; i++) {
      const bx = i * 28; const bh = Phaser.Math.Between(120, 260); const bw = Phaser.Math.Between(18, 30);
      g.fillStyle(bldColors[i % 3], 1); g.fillRect(bx, 400 - bh, bw, bh);
      g.fillStyle(0x004488, 0.6);
      for (let wy = 400 - bh + 10; wy < 390; wy += 20)
        for (let wx = bx + 4; wx < bx + bw - 4; wx += 8)
          if (Math.random() > 0.3) g.fillRect(wx, wy, 4, 8);
    }
    g.generateTexture(key, 512, 400); g.destroy(); return key;
  }

  private generateCityMid(): string {
    const key = "_ogw_mid";
    if (this.textures.exists(key)) return key;
    const g = this.make.graphics({ add: false } as any);
    g.fillStyle(0x000000, 0); g.fillRect(0, 0, 512, 400);
    for (let i = 0; i < 12; i++) {
      const bx = i * 42; const bh = Phaser.Math.Between(80, 180); const bw = Phaser.Math.Between(28, 45);
      g.fillStyle(0x1a1a3a, 1); g.fillRect(bx, 400 - bh, bw, bh);
      g.fillStyle(0x00ffff, 0.4);
      g.fillRect(bx, 400 - bh, bw, 3);
      g.fillStyle(0x0088ff, 0.5);
      for (let wy = 400 - bh + 12; wy < 395; wy += 16)
        for (let wx = bx + 4; wx < bx + bw - 4; wx += 10)
          if (Math.random() > 0.4) g.fillRect(wx, wy, 5, 8);
    }
    g.generateTexture(key, 512, 400); g.destroy(); return key;
  }

  private generateCaveBg(): string {
    const key = "_ogw_cave";
    if (this.textures.exists(key)) return key;
    const g = this.make.graphics({ add: false } as any);
    g.fillStyle(0x080818, 1); g.fillRect(0, 0, 512, 580);
    // Stalactites
    g.fillStyle(0x222244, 1);
    for (let i = 0; i < 20; i++) {
      const sx = i * 25 + Phaser.Math.Between(-5, 5);
      const sh = Phaser.Math.Between(20, 80);
      g.fillTriangle(sx, 0, sx + 10, 0, sx + 5, sh);
    }
    // Rock texture
    g.fillStyle(0x151530, 1);
    for (let i = 0; i < 30; i++) {
      const rx = Phaser.Math.Between(0, 500); const ry = Phaser.Math.Between(100, 500);
      const rw = Phaser.Math.Between(20, 60); const rh = Phaser.Math.Between(15, 40);
      g.fillEllipse(rx, ry, rw, rh);
    }
    // Glowing mushrooms
    g.fillStyle(0x6622ff, 0.6);
    for (let i = 0; i < 8; i++) {
      const mx = i * 60 + 20; const my = 520;
      g.fillEllipse(mx, my - 15, 14, 20);
      g.fillRect(mx - 2, my - 5, 4, 20);
    }
    g.generateTexture(key, 512, 580); g.destroy(); return key;
  }

  private generateHellBg(): string {
    const key = "_ogw_hell";
    if (this.textures.exists(key)) return key;
    const g = this.make.graphics({ add: false } as any);
    // Hell sky
    for (let y = 0; y < 200; y++) {
      const t = y / 200;
      const r = Math.floor(Phaser.Math.Linear(30, 80, t));
      g.fillStyle(Phaser.Display.Color.GetColor(r, 5, 5), 1);
      g.fillRect(0, y, 512, 1);
    }
    // Lava cracks
    g.fillStyle(0xff4400, 0.5);
    for (let i = 0; i < 15; i++) {
      const lx = Phaser.Math.Between(0, 500); const ly = Phaser.Math.Between(100, 190);
      g.fillRect(lx, ly, Phaser.Math.Between(20, 80), 2);
    }
    // Fire stalactites
    g.fillStyle(0xff2200, 0.8);
    for (let i = 0; i < 12; i++) {
      const sx = i * 42;
      g.fillTriangle(sx, 0, sx + 15, 0, sx + 7, Phaser.Math.Between(30, 80));
    }
    g.generateTexture(key, 512, 200); g.destroy(); return key;
  }

  // ─── BUILD WORLD ─────────────────────────────────────────────────────────────
  private buildWorld() {
    this.groundSurface = this.physics.add.staticGroup();
    this.groundCave    = this.physics.add.staticGroup();
    this.groundHell    = this.physics.add.staticGroup();
    this.platforms     = this.physics.add.staticGroup();

    // Generate ground textures
    this.generateGroundTex("_surf_ground",  0x1a1a2e, 0x00ffff,  0x0a0a1a);
    this.generateGroundTex("_cave_ground",  0x1a1a0a, 0x8855ff,  0x0a0a05);
    this.generateGroundTex("_hell_ground",  0x2a0808, 0xff4400,  0x1a0404);
    this.generateGroundTex("_platform_gnd", 0x2a2a4a, 0x0088ff,  0x0a0a1a);
    this.generateGroundTex("_cave_plat",    0x2a2a1a, 0x8855ff,  0x0a0a05);
    this.generateGroundTex("_hell_plat",    0x3a1a0a, 0xff4400,  0x1a0404);

    // ── Surface ground (leave gaps for dive pits) ──
    const pitXRanges = DIVE_PITS.filter(p => p.fromLayer === "surface").map(p => [p.x, p.x + p.w]);
    this.buildGroundStrip(this.groundSurface, "_surf_ground", 0, WORLD_W, SURFACE_GROUND, pitXRanges);

    // ── Surface platforms (jumping platforms in each zone) ──
    const surfacePlatforms = [
      // City area
      [600, SURFACE_GROUND - 130, 120], [900, SURFACE_GROUND - 200, 100], [1200, SURFACE_GROUND - 140, 120],
      [1600, SURFACE_GROUND - 170, 100],
      // Plains
      [2300, SURFACE_GROUND - 140, 100], [2700, SURFACE_GROUND - 200, 80], [3000, SURFACE_GROUND - 160, 100], [3500, SURFACE_GROUND - 220, 80],
      // Troll Dimension
      [4200, SURFACE_GROUND - 150, 100], [4600, SURFACE_GROUND - 220, 80], [5000, SURFACE_GROUND - 170, 100],
      [5400, SURFACE_GROUND - 250, 80], [5600, SURFACE_GROUND - 300, 100], [5900, SURFACE_GROUND - 200, 80],
      // Exile Forest
      [6300, SURFACE_GROUND - 160, 100], [6600, SURFACE_GROUND - 230, 80], [7000, SURFACE_GROUND - 190, 100],
      [7400, SURFACE_GROUND - 260, 80], [7700, SURFACE_GROUND - 150, 100],
      // Banned Tundra
      [8300, SURFACE_GROUND - 170, 100], [8700, SURFACE_GROUND - 240, 80], [9100, SURFACE_GROUND - 190, 100],
      [9500, SURFACE_GROUND - 200, 100], [9800, SURFACE_GROUND - 270, 80],
      // Spam Swamp
      [10300, SURFACE_GROUND - 160, 100], [10700, SURFACE_GROUND - 230, 80], [11100, SURFACE_GROUND - 190, 100],
      [11500, SURFACE_GROUND - 210, 100], [11800, SURFACE_GROUND - 280, 80],
      // Colosseum / Secret
      [12300, SURFACE_GROUND - 170, 100], [12700, SURFACE_GROUND - 250, 80], [13100, SURFACE_GROUND - 190, 100],
      [14400, SURFACE_GROUND - 180, 120], [14800, SURFACE_GROUND - 240, 100], [15200, SURFACE_GROUND - 200, 120],
      [15600, SURFACE_GROUND - 270, 80],
    ];
    for (const [px, py, pw] of surfacePlatforms) {
      this.buildPlatform(this.platforms, "_platform_gnd", px, py, pw);
    }

    // ── Cave ground ──
    const cavePitRanges = DIVE_PITS.filter(p => p.fromLayer === "cave").map(p => [p.x, p.x + p.w]);
    this.buildGroundStrip(this.groundCave, "_cave_ground", 0, WORLD_W, CAVE_GROUND, cavePitRanges);

    // Cave platforms
    const cavePlats = [
      [400, CAVE_GROUND - 140, 100], [800, CAVE_GROUND - 200, 80], [1200, CAVE_GROUND - 160, 100],
      [1600, CAVE_GROUND - 220, 80], [2000, CAVE_GROUND - 170, 100], [2400, CAVE_GROUND - 250, 80],
      [3000, CAVE_GROUND - 180, 100], [3600, CAVE_GROUND - 240, 80], [4200, CAVE_GROUND - 200, 100],
      [5000, CAVE_GROUND - 160, 100], [5600, CAVE_GROUND - 230, 80], [6200, CAVE_GROUND - 190, 100],
      [7000, CAVE_GROUND - 260, 80], [7800, CAVE_GROUND - 180, 100], [8500, CAVE_GROUND - 220, 80],
      [9200, CAVE_GROUND - 190, 100], [9800, CAVE_GROUND - 250, 80], [10500, CAVE_GROUND - 170, 100],
      [11200, CAVE_GROUND - 230, 80], [11900, CAVE_GROUND - 190, 100], [12600, CAVE_GROUND - 200, 80],
      [13200, CAVE_GROUND - 160, 100], [14400, CAVE_GROUND - 200, 100], [15000, CAVE_GROUND - 260, 80],
    ];
    for (const [px, py, pw] of cavePlats) {
      this.buildPlatform(this.platforms, "_cave_plat", px, py, pw);
    }

    // ── Hell ground ──
    this.buildGroundStrip(this.groundHell, "_hell_ground", 0, WORLD_W, HELL_GROUND, []);

    // Hell platforms (floating rock islands)
    const hellPlats = [
      [400, HELL_GROUND - 130, 100], [900, HELL_GROUND - 200, 80], [1400, HELL_GROUND - 160, 100],
      [1900, HELL_GROUND - 240, 80], [2500, HELL_GROUND - 180, 100], [3200, HELL_GROUND - 220, 80],
      [4000, HELL_GROUND - 170, 100], [4700, HELL_GROUND - 260, 80], [5400, HELL_GROUND - 200, 100],
      [6100, HELL_GROUND - 180, 100], [6800, HELL_GROUND - 240, 80], [7500, HELL_GROUND - 190, 100],
      [8200, HELL_GROUND - 260, 80], [8900, HELL_GROUND - 180, 100], [9600, HELL_GROUND - 220, 80],
      [10300, HELL_GROUND - 180, 100], [11000, HELL_GROUND - 250, 80], [11700, HELL_GROUND - 190, 100],
      [12400, HELL_GROUND - 210, 80], [13100, HELL_GROUND - 170, 100], [14400, HELL_GROUND - 200, 100],
      [15000, HELL_GROUND - 270, 80],
    ];
    for (const [px, py, pw] of hellPlats) {
      this.buildPlatform(this.platforms, "_hell_plat", px, py, pw);
    }
  }

  private buildGroundStrip(
    group: Phaser.Physics.Arcade.StaticGroup, texKey: string,
    x1: number, x2: number, y: number, gaps: number[][]
  ) {
    const seg = 160;
    for (let x = x1; x < x2; x += seg) {
      const inGap = gaps.some(([gx, gx2]) => x < gx2 && x + seg > gx);
      if (!inGap) {
        const img = this.add.image(x + seg / 2, y + 20, texKey).setOrigin(0.5, 0);
        group.add(img, true);
        (img.body as Phaser.Physics.Arcade.StaticBody).setSize(seg, 40);
      }
    }
  }

  private buildPlatform(
    group: Phaser.Physics.Arcade.StaticGroup, texKey: string,
    x: number, y: number, w: number
  ) {
    const img = this.add.image(x + w / 2, y, texKey).setOrigin(0.5, 1).setDepth(5);
    group.add(img, true);
    (img.body as Phaser.Physics.Arcade.StaticBody).setSize(w, 20).setOffset(0, -20);
    return img;
  }

  private generateGroundTex(key: string, baseCol: number, edgeCol: number, shadowCol: number) {
    if (this.textures.exists(key)) return;
    const g = this.make.graphics({ add: false } as any);
    g.fillStyle(baseCol, 1); g.fillRect(0, 0, 160, 40);
    g.fillStyle(edgeCol, 1); g.fillRect(0, 0, 160, 4);
    g.fillStyle(shadowCol, 1); g.fillRect(0, 36, 160, 4);
    // Texture pattern
    g.fillStyle(edgeCol, 0.15);
    for (let bx = 0; bx < 160; bx += 40) g.fillRect(bx, 4, 38, 32);
    g.generateTexture(key, 160, 40); g.destroy();
  }

  // ─── BUILD PITS (dive holes between layers) ────────────────────────────────
  private buildPits() {
    // Visual pit markers (warning signs)
    for (const pit of DIVE_PITS) {
      const ly = pit.fromLayer === "surface" ? SURFACE_GROUND : CAVE_GROUND;
      const g = this.add.graphics().setDepth(4);
      g.fillStyle(0xff4400, 0.7); g.fillRect(pit.x, ly - 4, pit.w, 4);
      // Arrow pointing down
      g.fillStyle(0xffff00, 0.9);
      g.fillTriangle(pit.x + pit.w / 2 - 10, ly - 20, pit.x + pit.w / 2 + 10, ly - 20, pit.x + pit.w / 2, ly - 6);
      // Label
      this.add.text(pit.x + pit.w / 2, ly - 38, "↓", {
        fontSize: "18px", color: "#ffaa00", fontFamily: "monospace"
      }).setOrigin(0.5, 1).setDepth(6);
    }
  }

  // ─── BUILD PORTALS (return portals) ────────────────────────────────────────
  private buildPortals() {
    this.caveReturnPortals = this.physics.add.staticGroup();
    this.hellReturnPortals = this.physics.add.staticGroup();

    for (const pit of DIVE_PITS) {
      if (pit.fromLayer === "surface") {
        // Portal in cave to go back to surface
        this.addPortal(this.caveReturnPortals, pit.toX + pit.w / 2, CAVE_GROUND - 30, 0x6644ff, "↑ Surface");
      }
      if (pit.fromLayer === "cave") {
        // Portal in hell to go back to cave
        this.addPortal(this.hellReturnPortals, pit.toX + pit.w / 2, HELL_GROUND - 30, 0xff4400, "↑ Cave");
      }
    }
  }

  private addPortal(
    group: Phaser.Physics.Arcade.StaticGroup,
    x: number, y: number, color: number, label: string
  ) {
    const g = this.make.graphics({ add: false } as any);
    g.fillStyle(color, 0.8); g.fillCircle(30, 30, 30);
    g.fillStyle(0xffffff, 0.3); g.fillCircle(30, 30, 20);
    g.generateTexture(`_portal_${x}_${y}`, 60, 60); g.destroy();

    const img = this.add.image(x, y, `_portal_${x}_${y}`).setDepth(6);
    group.add(img, true);
    (img.body as Phaser.Physics.Arcade.StaticBody).setCircle(30);

    // Animate portal
    this.tweens.add({ targets: img, scaleX: 1.15, scaleY: 1.15, alpha: 0.7, duration: 900, yoyo: true, repeat: -1 });
    this.add.text(x, y - 44, label, { fontSize: "11px", color: "#ffffff", fontFamily: "monospace", backgroundColor: "#00000088" }).setOrigin(0.5, 1).setDepth(7);
  }

  // ─── BREAK WALLS ──────────────────────────────────────────────────────────
  private buildBreakWalls() {
    for (const def of BREAK_WALLS) {
      const groundY = def.layer === "surface" ? SURFACE_GROUND : def.layer === "cave" ? CAVE_GROUND : HELL_GROUND;
      const wx = def.x; const wy = groundY - 120;
      const gfx = this.add.graphics().setDepth(8);
      gfx.fillStyle(0x886622, 1); gfx.fillRect(0, 0, 48, 80);
      gfx.lineStyle(2, 0xcc9944, 1); gfx.strokeRect(0, 0, 48, 80);
      gfx.fillStyle(0x664400, 1);
      gfx.fillRect(4, 4, 18, 12); gfx.fillRect(26, 4, 18, 12);
      gfx.fillRect(4, 20, 40, 12); gfx.fillRect(4, 36, 18, 12); gfx.fillRect(26, 36, 18, 12);
      gfx.fillRect(4, 52, 40, 12); gfx.fillRect(4, 68, 18, 8); gfx.fillRect(26, 68, 18, 8);
      gfx.setPosition(wx, wy);

      const rect = this.physics.add.image(wx + 24, wy + 40, "__DEFAULT").setVisible(false).setDepth(8);
      (rect.body as Phaser.Physics.Arcade.Body).setSize(48, 80).setImmovable(true).setAllowGravity(false);
      this.physics.add.collider(this.player, rect);

      // Crack indicator
      const hpLabel = this.add.text(wx + 24, wy - 8, "█████", {
        fontSize: "10px", color: "#cc8822", fontFamily: "monospace"
      }).setOrigin(0.5, 1).setDepth(9);

      (rect as any)._hpLabel = hpLabel;
      (rect as any)._gfx = gfx;
      (rect as any)._def = def;
      (rect as any)._hits = def.hitsLeft;

      this.breakWalls.push({ def, rect, gfx, hitsLeft: def.hitsLeft });

      // Add "breakable" text hint
      this.add.text(wx + 24, wy - 22, "🔨 HIT ME", {
        fontSize: "9px", color: "#ffaa44", fontFamily: "monospace"
      }).setOrigin(0.5, 1).setDepth(9).setAlpha(0.7);
    }
  }

  // ─── BOSS GATES ──────────────────────────────────────────────────────────
  private buildBossGates() {
    for (const br of BOSS_ROOMS) {
      const key = `${br.layer}_${br.x1}`;
      const groundY = br.layer === "surface" ? SURFACE_GROUND : br.layer === "cave" ? CAVE_GROUND : HELL_GROUND;

      // Gate door visual
      const gfx = this.add.graphics().setDepth(10);
      this.drawBossGate(gfx, br.x1, groundY);
      this.bossGates.set(key, gfx);

      // Lock text
      const txt = this.add.text(br.x1 + 80, groundY - 180, `⚔️ BOSS GATE\nNeed ${br.zone.bossRequired} warriors`, {
        fontSize: "14px", color: "#ff4400", fontFamily: "monospace",
        align: "center", backgroundColor: "#00000099"
      }).setOrigin(0.5, 1).setDepth(11);
      this.bossGateTexts.set(key, txt);
    }
  }

  private drawBossGate(gfx: Phaser.GameObjects.Graphics, x: number, groundY: number) {
    gfx.clear();
    // Door frame
    gfx.fillStyle(0x440000, 1); gfx.fillRect(x + 40, groundY - 200, 80, 200);
    gfx.lineStyle(4, 0xff2200, 1); gfx.strokeRect(x + 40, groundY - 200, 80, 200);
    // Skull symbol
    gfx.fillStyle(0xff0000, 0.8); gfx.fillCircle(x + 80, groundY - 140, 28);
    gfx.fillStyle(0x440000, 1);
    gfx.fillEllipse(x + 70, groundY - 145, 12, 14);
    gfx.fillEllipse(x + 90, groundY - 145, 12, 14);
    gfx.fillRect(x + 68, groundY - 120, 6, 10); gfx.fillRect(x + 78, groundY - 120, 6, 10); gfx.fillRect(x + 88, groundY - 120, 6, 10);
    // Chains
    gfx.lineStyle(3, 0x884400, 1);
    for (let cy = groundY - 200; cy < groundY; cy += 20) {
      gfx.strokeCircle(x + 40, cy + 10, 6);
      gfx.strokeCircle(x + 120, cy + 10, 6);
    }
  }

  // ─── DECORATIONS ─────────────────────────────────────────────────────────
  private buildDecorations() {
    // Surface decorations per zone
    for (const z of ZONES.filter(z => z.layer === "surface")) {
      this.decorateSurfaceZone(z);
    }
    // Cave decorations
    this.decorateCave();
    // Hell decorations
    this.decorateHell();
    // Ambient particles (lava sparks in hell, dust in cave)
    this.add.particles(0, 0, "_surf_ground", {
      x: { min: 0, max: WORLD_W }, y: HELL_GROUND - 10,
      speedY: -80, speedX: { min: -20, max: 20 },
      scale: { start: 0.05, end: 0 }, alpha: { start: 0.8, end: 0 },
      tint: [0xff4400, 0xff8800, 0xffaa00],
      lifespan: 1200, quantity: 0.5, blendMode: Phaser.BlendModes.ADD
    }).setDepth(3);
  }

  private decorateSurfaceZone(z: Zone) {
    const g = this.add.graphics().setDepth(3);
    if (z.name === "Bahamas City") {
      // City buildings
      for (let bx = 100; bx < 1950; bx += 120) {
        const bh = Phaser.Math.Between(140, 300);
        g.fillStyle(Phaser.Math.Between(0x112244, 0x221155), 1); g.fillRect(bx, SURFACE_GROUND - bh, 80, bh);
        g.fillStyle(z.accent, 0.4); g.fillRect(bx, SURFACE_GROUND - bh, 80, 3);
        // Windows
        g.fillStyle(z.accent, 0.5);
        for (let wy = SURFACE_GROUND - bh + 15; wy < SURFACE_GROUND - 15; wy += 25)
          for (let wx = bx + 8; wx < bx + 72; wx += 18)
            if (Math.random() > 0.3) g.fillRect(wx, wy, 9, 14);
      }
    } else if (z.name === "Bahamas Plains") {
      // Trees
      for (let tx = 2100; tx < 4000; tx += 180) {
        const th = Phaser.Math.Between(60, 120);
        g.fillStyle(0x441100, 1); g.fillRect(tx + 8, SURFACE_GROUND - th, 12, th);
        g.fillStyle(z.accent, 1); g.fillCircle(tx + 14, SURFACE_GROUND - th - 20, Phaser.Math.Between(25, 45));
      }
    } else if (z.name === "Troll Dimension") {
      // Dark spiky trees and crystals
      for (let tx = 4100; tx < 6000; tx += 160) {
        g.fillStyle(0x220044, 1); g.fillRect(tx + 6, SURFACE_GROUND - 80, 8, 80);
        g.fillStyle(z.accent, 0.8);
        for (let i = 0; i < 4; i++) g.fillTriangle(tx - 15 + i * 12, SURFACE_GROUND - 40, tx + 15 + i * 12, SURFACE_GROUND - 40, tx + i * 12, SURFACE_GROUND - 90);
        g.fillStyle(0x9944ff, 0.9); g.fillRect(tx + 40, SURFACE_GROUND - 50, 8, 50);
      }
    } else if (z.name === "Exile Forest") {
      // Twisted dark trees
      for (let tx = 6100; tx < 8000; tx += 150) {
        g.fillStyle(0x112211, 1);
        g.fillTriangle(tx, SURFACE_GROUND, tx + 40, SURFACE_GROUND, tx + 20, SURFACE_GROUND - 120);
        g.fillStyle(z.accent, 0.3); g.fillCircle(tx + 20, SURFACE_GROUND - 100, 30);
      }
    } else if (z.name === "Banned Tundra") {
      // Ice spires
      for (let ix = 8100; ix < 10000; ix += 130) {
        g.fillStyle(0x88ccff, 0.7);
        g.fillTriangle(ix, SURFACE_GROUND, ix + 20, SURFACE_GROUND, ix + 10, SURFACE_GROUND - Phaser.Math.Between(50, 120));
        g.fillStyle(0xaaddff, 0.4);
        g.fillTriangle(ix + 15, SURFACE_GROUND, ix + 35, SURFACE_GROUND, ix + 25, SURFACE_GROUND - Phaser.Math.Between(30, 80));
      }
    } else if (z.name === "Spam Swamp") {
      // Slime puddles and dead trees
      for (let sx = 10100; sx < 12000; sx += 200) {
        g.fillStyle(0x44ff00, 0.5); g.fillEllipse(sx + 40, SURFACE_GROUND, 80, 20);
        g.fillStyle(0x332211, 1); g.fillRect(sx + 6, SURFACE_GROUND - 70, 8, 70);
      }
    } else if (z.name === "Stream Colosseum") {
      // Arena pillars
      for (let cx = 12100; cx < 14000; cx += 180) {
        g.fillStyle(0x665544, 1); g.fillRect(cx + 10, SURFACE_GROUND - 200, 20, 200);
        g.fillStyle(z.accent, 0.5); g.fillRect(cx, SURFACE_GROUND - 210, 40, 15);
      }
    }
  }

  private decorateCave() {
    const g = this.add.graphics().setDepth(2);
    g.fillStyle(0x1a1a1a, 0.9);
    // Cave ceiling (solid)
    g.fillRect(0, CAVE_TOP, WORLD_W, 60);
    // Stalactites
    g.fillStyle(0x222244, 1);
    for (let sx = 100; sx < WORLD_W; sx += Phaser.Math.Between(40, 100)) {
      const sh = Phaser.Math.Between(30, 90);
      g.fillTriangle(sx, CAVE_TOP + 60, sx + 15, CAVE_TOP + 60, sx + 7, CAVE_TOP + 60 + sh);
    }
    // Stalagmites
    g.fillStyle(0x333344, 1);
    for (let sx = 80; sx < WORLD_W; sx += Phaser.Math.Between(60, 150)) {
      const sh = Phaser.Math.Between(20, 50);
      g.fillTriangle(sx, CAVE_GROUND, sx + 12, CAVE_GROUND, sx + 6, CAVE_GROUND - sh);
    }
    // Glowing crystals
    g.fillStyle(0x6622ff, 0.7);
    for (let cx = 200; cx < WORLD_W; cx += 400) {
      for (let i = 0; i < 3; i++) {
        const cxo = cx + i * 30 - 30;
        g.fillTriangle(cxo, CAVE_GROUND, cxo + 10, CAVE_GROUND, cxo + 5, CAVE_GROUND - Phaser.Math.Between(20, 50));
      }
    }
  }

  private decorateHell() {
    const g = this.add.graphics().setDepth(2);
    g.fillStyle(0x1a0000, 0.9);
    g.fillRect(0, HELL_TOP, WORLD_W, 60);
    // Fire ceiling
    g.fillStyle(0xff3300, 0.6);
    for (let fx = 50; fx < WORLD_W; fx += Phaser.Math.Between(30, 80)) {
      const fh = Phaser.Math.Between(20, 70);
      g.fillTriangle(fx, HELL_TOP + 60, fx + 18, HELL_TOP + 60, fx + 9, HELL_TOP + 60 + fh);
    }
    // Lava pools at ground level
    g.fillStyle(0xff4400, 0.8);
    for (let lx = 200; lx < WORLD_W; lx += 300) {
      g.fillEllipse(lx + 50, HELL_GROUND + 8, Phaser.Math.Between(80, 160), 24);
    }
    // Hell chains
    g.lineStyle(3, 0x663300, 1);
    for (let cx = 300; cx < WORLD_W; cx += 600) {
      for (let cy = HELL_TOP + 60; cy < HELL_GROUND - 50; cy += 20) {
        g.strokeCircle(cx, cy + 10, 7);
      }
    }
  }

  // ─── SPAWN COINS ─────────────────────────────────────────────────────────
  private spawnCoins() {
    this.coins = this.physics.add.group();
    const positions = [
      [500, SURFACE_GROUND - 160], [800, SURFACE_GROUND - 230], [1500, SURFACE_GROUND - 200],
      [2800, SURFACE_GROUND - 230], [4500, SURFACE_GROUND - 260], [7200, SURFACE_GROUND - 220],
      [9500, SURFACE_GROUND - 290], [11200, SURFACE_GROUND - 250], [14500, SURFACE_GROUND - 280],
      [1000, CAVE_GROUND - 170], [4200, CAVE_GROUND - 230], [8000, CAVE_GROUND - 200],
      [12000, CAVE_GROUND - 220], [1000, HELL_GROUND - 160], [5000, HELL_GROUND - 200],
    ];
    for (const [cx, cy] of positions) {
      const coin = this.physics.add.sprite(cx, cy, "coin_spin").setDepth(7).setScale(1.2);
      if (this.anims.exists("coin-spin")) coin.play("coin-spin");
      (coin.body as Phaser.Physics.Arcade.Body).setAllowGravity(false).setImmovable(true);
      this.tweens.add({ targets: coin, y: cy - 8, duration: 800, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      this.coins.add(coin);
    }
  }

  // ─── SPAWN ENEMIES ────────────────────────────────────────────────────────
  private spawnEnemies() {
    for (const spawn of ENEMY_SPAWNS) {
      // Skip enemies in boss rooms (they'll spawn with boss)
      const inBossRoom = BOSS_ROOMS.some(br => spawn.layer === br.layer && spawn.x >= br.x1 && spawn.x <= br.x2);
      if (inBossRoom) continue;

      const md = MONSTERS[spawn.type];
      const groundY = spawn.layer === "surface" ? SURFACE_GROUND : spawn.layer === "cave" ? CAVE_GROUND : HELL_GROUND;
      const sy = groundY - (md.frameH > 0 ? md.frameH : 50) * md.scale - 4;

      const texKey = md.spriteKey;
      const texOk = this.hasTexture(texKey);
      let sprite: Phaser.Physics.Arcade.Sprite;
      if (!texOk) {
        sprite = this.physics.add.sprite(spawn.x, sy, "__DEFAULT");
        sprite.setDisplaySize(md.frameW || 40, md.frameH || 48);
      } else if (md.spriteKey === "ghost" || md.spriteKey === "slime") {
        sprite = this.physics.add.sprite(spawn.x, sy, texKey);
        sprite.setScale(md.scale);
      } else {
        sprite = this.physics.add.sprite(spawn.x, sy, texKey, md.walkFrames[0]);
        sprite.setScale(md.scale);
        this.addEnemyAnim(spawn.type, md, sprite);
      }
      sprite.setTint(md.tint);
      sprite.setDepth(9);
      sprite.setCollideWorldBounds(false);
      if (md.spriteKey === "ghost") {
        sprite.setAlpha(0.75);
        this.tweens.add({ targets: sprite, alpha: 0.45, duration: 1200, yoyo: true, repeat: -1 });
      }

      const ground = spawn.layer === "surface" ? this.groundSurface : spawn.layer === "cave" ? this.groundCave : this.groundHell;
      this.physics.add.collider(sprite, ground);
      this.physics.add.collider(sprite, this.platforms);

      const hpBar = this.add.graphics().setDepth(11);
      this.enemies.push({
        sprite, hpBar, type: spawn.type, layer: spawn.layer,
        maxHp: md.hp, hp: md.hp, dmg: md.dmg, speed: md.speed, xp: md.xp,
        state: "patrol", patrolDir: 1, patrolTimer: 0, attackCooldown: 0,
        aggroRange: md.aggro,
      });
    }
  }

  private addEnemyAnim(type: MonsterType, md: MonsterData, sprite: Phaser.Physics.Arcade.Sprite) {
    const animKey = `${md.spriteKey}-walk`;
    if (this.anims.exists(animKey)) {
      sprite.play(animKey);
    }
  }

  // ─── BUILD PLAYER ────────────────────────────────────────────────────────
  private buildPlayer(cls: CharClass) {
    const cd = CLASSES[cls];
    const x = 200; const y = SURFACE_GROUND - 80;

    const texKey = cd.spriteKey;
    const texExists = this.textures.exists(texKey) && this.textures.get(texKey).key !== "__MISSING";

    if (cd.spriteKey === "knight") {
      this.player = this.physics.add.sprite(x, y, texExists ? "knight" : "__DEFAULT");
      if (texExists && this.anims.exists("knight-idle")) this.player.play("knight-idle");
    } else {
      this.player = this.physics.add.sprite(x, y, texExists ? texKey : "__DEFAULT", 0);
      const idleAnim = `${cd.spriteKey}-idle`;
      if (texExists && this.anims.exists(idleAnim)) this.player.play(idleAnim);
    }
    this.player.setTint(cd.tint);
    this.player.setScale(cd.spriteKey === "knight" ? 2 : 1.5);
    this.player.setDepth(10);
    this.player.setCollideWorldBounds(true);
    (this.player.body as Phaser.Physics.Arcade.Body).setGravityY(200);
    this.player.setMaxVelocity(800, 600);

    this.projectiles = this.physics.add.group();
  }

  // ─── BUILD INPUT ─────────────────────────────────────────────────────────
  private buildInput() {
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      up:    this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down:  this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left:  this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
    this.shiftKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
    this.fKey     = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.F);
    this.qKey     = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
    this.eKey     = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.rKey     = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    Phaser.Input.Keyboard.JustDown(this.fKey);
  }

  // ─── BUILD UI ────────────────────────────────────────────────────────────
  private buildUI() {
    this.zoneLabel = this.add.text(16, 16, "", {
      fontSize: "14px", color: "#00ffff", fontFamily: "monospace",
      backgroundColor: "#00000088", padding: { x: 8, y: 4 }
    }).setScrollFactor(0).setDepth(20);

    this.layerLabel = this.add.text(16, 44, "", {
      fontSize: "11px", color: "#aaaaff", fontFamily: "monospace",
      backgroundColor: "#00000055", padding: { x: 6, y: 2 }
    }).setScrollFactor(0).setDepth(20);

    this.respawnText = this.add.text(640, 320, "", {
      fontSize: "36px", color: "#ff4444", fontFamily: "monospace",
      backgroundColor: "#00000088", padding: { x: 20, y: 10 }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(30).setVisible(false);
  }

  // ─── UPDATE ──────────────────────────────────────────────────────────────
  update(time: number, delta: number) {
    const dt = delta / 1000;

    if (!this.isAlive) {
      this.handleRespawn(dt);
      return;
    }

    this.handleMovement(dt);
    this.handleAttack(time, dt);
    this.updateEnemies(time, dt);
    this.updateBosses(time, dt);
    this.updateBreakWalls();
    this.updateDiveTransitions();
    this.updateZoneDisplay();
    this.updateDamageNumbers(dt);
    this.updateProjectiles(dt);
    this.updateMpRegen(dt);
    this.checkBossProximity();
    this.emitStats();

    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    for (let i = 0; i < 3; i++) this.skillCooldowns[i] = Math.max(0, this.skillCooldowns[i] - dt);
    if (this.invincible > 0) this.invincible -= dt;

    // Scroll parallax
    this.bgSky.tilePositionX = this.cameras.main.scrollX * 0.1;
    this.bgFar.tilePositionX = this.cameras.main.scrollX * 0.25;
    this.bgMid.tilePositionX = this.cameras.main.scrollX * 0.5;
  }

  private handleMovement(dt: number) {
    const cd = this.playerClass;
    const speed = cd.speed * (this.shiftKey.isDown ? 1.75 : 1);
    const left  = this.cursors.left!.isDown  || this.wasd.left.isDown;
    const right = this.cursors.right!.isDown || this.wasd.right.isDown;
    const jump  = Phaser.Input.Keyboard.JustDown(this.cursors.up!) || Phaser.Input.Keyboard.JustDown(this.wasd.up);
    const onGround = (this.player.body as Phaser.Physics.Arcade.Body).blocked.down;

    if (left)       { this.player.setVelocityX(-speed); this.player.setFlipX(true); }
    else if (right) { this.player.setVelocityX(speed);  this.player.setFlipX(false); }
    else            { this.player.setVelocityX((this.player.body as Phaser.Physics.Arcade.Body).velocity.x * 0.75); }

    if (jump && onGround) { this.player.setVelocityY(-520); }

    // Animations
    const sk = cd.spriteKey;
    const moving = Math.abs((this.player.body as Phaser.Physics.Arcade.Body).velocity.x) > 20;
    if (sk === "knight") {
      if (!this.player.anims.isPlaying || this.player.anims.currentAnim?.key !== "knight-attack") {
        this.player.play(moving ? "knight-run" : "knight-idle", true);
      }
    } else {
      const run  = `${sk}-run`;  const idle = `${sk}-idle`;
      if (this.anims.exists(run) && this.anims.exists(idle)) {
        const curKey = this.player.anims.currentAnim?.key;
        if (curKey !== `${sk}-attack`) {
          this.player.play(moving ? run : idle, true);
        }
      }
    }
  }

  private handleAttack(_time: number, _dt: number) {
    const fDown = Phaser.Input.Keyboard.JustDown(this.fKey);
    if (fDown && this.attackCooldown <= 0) this.doAttack();
    if (Phaser.Input.Keyboard.JustDown(this.qKey) && this.skillCooldowns[0] <= 0) this.useSkill(0);
    if (Phaser.Input.Keyboard.JustDown(this.eKey) && this.skillCooldowns[1] <= 0) this.useSkill(1);
    if (Phaser.Input.Keyboard.JustDown(this.rKey) && this.skillCooldowns[2] <= 0) this.useSkill(2);
  }

  private doAttack() {
    if (this.attackCooldown > 0 || !this.isAlive) return;
    this.attackCooldown = 0.45;
    const cd = this.playerClass;
    const sk = cd.spriteKey;
    if (sk === "knight") this.player.play("knight-attack", true);
    else if (this.anims.exists(`${sk}-attack`)) this.player.play(`${sk}-attack`, true);

    const atkRange = 90;
    const facing   = this.player.flipX ? -1 : 1;
    const px       = this.player.x + facing * 40;
    const py       = this.player.y;

    let hit = false;
    for (const en of this.enemies) {
      if (en.state === "dead") continue;
      const dist = Math.abs(en.sprite.x - px);
      const dy   = Math.abs(en.sprite.y - py);
      if (dist < atkRange && dy < 80) {
        const crit = Math.random() < 0.2;
        const dmg = Math.floor(cd.atk * (crit ? 2 : 1) * (0.85 + Math.random() * 0.3));
        this.hitEnemy(en, dmg, crit);
        hit = true;
      }
    }
    // Ranged attack for Ranger/Mage
    if (!hit && (cd.spriteKey === "brawler" || cd.spriteKey === "bobs")) {
      this.fireProjectile(facing, cd.atk);
    }
    // Hit breakable walls
    for (const bw of this.breakWalls) {
      if (bw.hitsLeft <= 0) continue;
      const gwY = bw.def.layer === "surface" ? SURFACE_GROUND : bw.def.layer === "cave" ? CAVE_GROUND : HELL_GROUND;
      const bwY = gwY - 120 + 40;
      if (Math.abs(bw.rect.x - this.player.x) < 80 && Math.abs(bwY - this.player.y) < 100) {
        this.hitBreakWall(bw);
      }
    }
  }

  private fireProjectile(dir: number, atk: number) {
    const proj = this.physics.add.image(this.player.x, this.player.y - 10, "arrow");
    proj.setScale(dir < 0 ? -1.5 : 1.5, 1.5);
    proj.setVelocityX(dir * 600);
    proj.setDepth(8);
    proj.setGravityY(-200);
    (proj as any)._dmg = Math.floor(atk * 0.7);
    (proj as any)._born = this.time.now;
    this.projectiles.add(proj);
  }

  private useSkill(idx: number) {
    const cd = this.playerClass;
    const mpCost = [25, 35, 50][idx];
    if (this.playerMp < mpCost) { this.spawnFloatingText(this.player.x, this.player.y - 40, "No MP!", "#ff8888"); return; }
    this.playerMp -= mpCost;
    this.skillCooldowns[idx] = [4, 8, 20][idx];

    const facing = this.player.flipX ? -1 : 1;
    const skillName = cd.skills[idx];
    this.spawnFloatingText(this.player.x, this.player.y - 60, skillName, "#ffff00");

    const px = this.player.x; const py = this.player.y;
    if (idx === 0) {
      // Skill Q: close-range burst
      for (const en of this.enemies.filter(e => e.state !== "dead")) {
        if (Math.abs(en.sprite.x - px) < 150 && Math.abs(en.sprite.y - py) < 80) {
          this.hitEnemy(en, Math.floor(cd.atk * 1.8), false);
        }
      }
      this.spawnExplosion(px + facing * 80, py);
    } else if (idx === 1) {
      // Skill E: multi-hit AoE
      for (const en of this.enemies.filter(e => e.state !== "dead")) {
        if (Math.abs(en.sprite.x - px) < 250 && Math.abs(en.sprite.y - py) < 120) {
          this.hitEnemy(en, Math.floor(cd.atk * 1.2), false);
        }
      }
      this.spawnExplosion(px, py - 20);
    } else {
      // Skill R: ultimate
      for (const en of this.enemies.filter(e => e.state !== "dead")) {
        if (Math.abs(en.sprite.x - px) < 400) {
          this.hitEnemy(en, Math.floor(cd.atk * 3.5), true);
        }
      }
      for (const boss of this.bosses.filter(b => b.alive)) {
        if (Math.abs(boss.sprite.x - px) < 400) {
          this.hitBoss(boss, Math.floor(cd.atk * 2.5));
        }
      }
      this.spawnExplosion(px + facing * 100, py - 30);
      this.spawnExplosion(px + facing * 200, py - 10);
    }
  }

  // ─── ENEMY HIT ────────────────────────────────────────────────────────────
  private hitEnemy(en: EnemyData, dmg: number, crit: boolean) {
    en.hp -= dmg;
    this.spawnDamageNumber(en.sprite.x, en.sprite.y - 40, dmg, crit);
    if (en.hp <= 0) {
      this.killEnemy(en);
    } else {
      en.sprite.setTint(0xff4444);
      this.time.delayedCall(180, () => { if (en.sprite?.active) en.sprite.setTint(MONSTERS[en.type].tint); });
      en.state = "aggro";
    }
    this.drawEnemyHp(en);
  }

  private killEnemy(en: EnemyData) {
    en.state = "dead";
    en.hp = 0;
    this.playerXp += en.xp;
    this.playerKills++;
    if (this.playerXp >= this.playerLevel * 100) {
      this.playerLevel++;
      this.playerMaxHp = Math.floor(this.playerClass.hp * (1 + this.playerLevel * 0.05));
      this.playerHp = Math.min(this.playerHp + 60, this.playerMaxHp);
      this.spawnFloatingText(this.player.x, this.player.y - 80, `LEVEL UP! ${this.playerLevel}`, "#ffff00");
    }
    // Drop gem
    if (Math.random() < 0.3) {
      const gem = this.add.image(en.sprite.x, en.sprite.y, "gem").setScale(0.5).setDepth(7);
      this.tweens.add({ targets: gem, y: gem.y - 40, alpha: 0, duration: 1000, onComplete: () => gem.destroy() });
    }

    const type = en.type;
    let dieAnim = "";
    if (type === "troll" || type === "guard") dieAnim = "metalslug-die";
    if (dieAnim && this.anims.exists(dieAnim)) {
      en.sprite.play(dieAnim);
      en.sprite.once("animationcomplete", () => { en.sprite.destroy(); });
    } else {
      this.spawnExplosion(en.sprite.x, en.sprite.y);
      en.sprite.destroy();
    }
    en.hpBar.destroy();
  }

  private drawEnemyHp(en: EnemyData) {
    en.hpBar.clear();
    if (en.state === "dead") return;
    const bw = 40; const pct = en.hp / en.maxHp;
    en.hpBar.fillStyle(0x000000, 0.7); en.hpBar.fillRect(en.sprite.x - bw / 2, en.sprite.y - 60, bw, 6);
    en.hpBar.fillStyle(pct > 0.5 ? 0x44ff44 : pct > 0.25 ? 0xffaa00 : 0xff2222, 1);
    en.hpBar.fillRect(en.sprite.x - bw / 2, en.sprite.y - 60, bw * pct, 6);
  }

  // ─── ENEMY AI ─────────────────────────────────────────────────────────────
  private updateEnemies(_time: number, dt: number) {
    const px = this.player.x; const py = this.player.y;
    for (const en of this.enemies) {
      if (en.state === "dead" || !en.sprite.active) continue;

      // Only update enemies near camera
      if (Math.abs(en.sprite.x - this.cameras.main.scrollX - 640) > 1200) {
        en.hpBar.clear();
        continue;
      }

      // Layer check - don't aggro across layers
      const sameLayer = en.layer === this.playerLayer;
      const dist = sameLayer ? Math.sqrt((en.sprite.x - px) ** 2 + (en.sprite.y - py) ** 2) : Infinity;

      en.attackCooldown = Math.max(0, en.attackCooldown - dt);
      en.patrolTimer    = Math.max(0, en.patrolTimer - dt);

      if (dist < en.aggroRange && sameLayer) {
        en.state = "aggro";
      } else if (en.state === "aggro" && dist > en.aggroRange * 1.5) {
        en.state = "patrol";
      }

      if (en.state === "aggro") {
        const dir = en.sprite.x < px ? 1 : -1;
        en.sprite.setVelocityX(dir * en.speed);
        en.sprite.setFlipX(dir < 0);
        if (dist < 55 && en.attackCooldown <= 0) {
          en.attackCooldown = 1.5;
          this.enemyHitPlayer(en);
        }
      } else {
        // Patrol
        if (en.patrolTimer <= 0) {
          en.patrolDir  *= -1;
          en.patrolTimer = Phaser.Math.FloatBetween(1.5, 3.5);
        }
        en.sprite.setVelocityX(en.patrolDir * en.speed * 0.4);
        en.sprite.setFlipX(en.patrolDir < 0);
      }

      // Ghost hovers
      if (en.type === "ghost" || en.type === "iceling") {
        en.sprite.setVelocityY(Math.sin(this.time.now * 0.002 + en.sprite.x) * 30);
        (en.sprite.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
      }

      this.drawEnemyHp(en);
    }
  }

  private enemyHitPlayer(en: EnemyData) {
    if (this.invincible > 0) return;
    this.playerHp -= en.dmg;
    this.invincible = 0.8;
    this.cameras.main.shake(180, 0.008);
    this.spawnDamageNumber(this.player.x, this.player.y - 50, en.dmg, false, "#ff4444");
    if (this.playerHp <= 0) this.killPlayer();
  }

  // ─── BOSS LOGIC ──────────────────────────────────────────────────────────
  private checkBossProximity() {
    this.nearBossRoom = false;
    for (const br of BOSS_ROOMS) {
      if (br.layer !== this.playerLayer) continue;
      const groundY = br.layer === "surface" ? SURFACE_GROUND : br.layer === "cave" ? CAVE_GROUND : HELL_GROUND;
      const inX = this.player.x >= br.x1 && this.player.x <= br.x2;
      const inY = Math.abs(this.player.y - groundY) < 200;
      if (inX && inY) {
        this.nearBossRoom = true;
        // Check if boss already spawned
        const bossAlive = this.bosses.some(b => b.alive &&
          b.sprite.x >= br.x1 && b.sprite.x <= br.x2 &&
          b.zone.layer === br.layer);
        if (!bossAlive) {
          const needed = br.zone.bossRequired ?? 10;
          if (this.onlineCount >= needed) {
            this.spawnBoss(br);
            this.onBossUnlock();
          } else {
            this.bossLockTimer += 1;
            if (this.bossLockTimer % 60 === 0) {
              this.onBossLock(needed, this.onlineCount, br.zone.name);
            }
          }
        }
        break;
      }
    }
    if (!this.nearBossRoom) this.bossLockTimer = 0;
  }

  private spawnBoss(br: { x1: number; x2: number; layer: ZoneLayer; zone: Zone }) {
    const groundY = br.layer === "surface" ? SURFACE_GROUND : br.layer === "cave" ? CAVE_GROUND : HELL_GROUND;
    const bx = br.x1 + (br.x2 - br.x1) / 2;
    const by = groundY - 90;

    const sprite = this.physics.add.sprite(bx, by, "dragon").play("dragon-fly").setDepth(12).setCollideWorldBounds(false);
    const bossScale = br.layer === "surface" ? 2.5 : br.layer === "cave" ? 3 : 3.5;
    sprite.setScale(bossScale);
    const tintMap: Record<ZoneLayer, number> = { surface: 0xff8800, cave: 0xaa44ff, hell: 0xff0044 };
    sprite.setTint(tintMap[br.layer]);
    sprite.body.setAllowGravity(false);

    const ground = br.layer === "surface" ? this.groundSurface : br.layer === "cave" ? this.groundCave : this.groundHell;
    this.physics.add.collider(sprite, ground);

    const hpMult = br.layer === "surface" ? 1 : br.layer === "cave" ? 1.5 : 2;
    const maxHp = Math.floor(2000 * hpMult);

    const hpBarBg = this.add.graphics().setScrollFactor(0).setDepth(25);
    const hpBar   = this.add.graphics().setScrollFactor(0).setDepth(26);
    this.drawBossHpBar(hpBar, hpBarBg, maxHp, maxHp, br.zone.name);

    const boss: BossData = { sprite, hpBar, hpBarBg, hp: maxHp, maxHp, phase: 1, alive: true, attackTimer: 0, moveDir: 1, zone: br.zone };
    this.bosses.push(boss);

    // Remove gate
    const key = `${br.layer}_${br.x1}`;
    this.bossGates.get(key)?.destroy();
    this.bossGateTexts.get(key)?.destroy();

    this.spawnFloatingText(bx, by - 80, `⚔️ ${br.zone.name.replace("🔒 ", "")} BOSS!`, "#ff4400");
  }

  private updateBosses(_time: number, dt: number) {
    for (const boss of this.bosses) {
      if (!boss.alive) continue;
      boss.attackTimer += dt;
      const px = this.player.x; const py = this.player.y;
      const dist = Math.sqrt((boss.sprite.x - px) ** 2 + (boss.sprite.y - py) ** 2);

      // Phase changes
      if (boss.hp < boss.maxHp * 0.5 && boss.phase === 1) {
        boss.phase = 2;
        boss.sprite.setTint(0xff0000);
        this.spawnFloatingText(boss.sprite.x, boss.sprite.y - 60, "PHASE 2!", "#ff0000");
      }
      if (boss.hp < boss.maxHp * 0.25 && boss.phase === 2) {
        boss.phase = 3;
        boss.sprite.setTint(0xffffff);
        boss.sprite.setScale(boss.sprite.scaleX * 1.3);
        this.spawnFloatingText(boss.sprite.x, boss.sprite.y - 60, "ENRAGE!", "#ff00ff");
      }

      // Movement - hover and charge
      const speed = boss.phase === 3 ? 280 : boss.phase === 2 ? 200 : 140;
      const dir = boss.sprite.x < px ? 1 : -1;
      boss.sprite.setVelocityX(dir * speed * 0.5);
      boss.sprite.setFlipX(dir < 0);

      // Hover bounce
      boss.sprite.setVelocityY(Math.sin(this.time.now * 0.003) * 60);

      // Attacks
      const atkInterval = boss.phase === 3 ? 1.2 : boss.phase === 2 ? 1.8 : 2.5;
      if (boss.attackTimer >= atkInterval) {
        boss.attackTimer = 0;
        boss.sprite.play("dragon-attack", true).once("animationcomplete", () => boss.sprite.play("dragon-fly", true));

        if (dist < 300) {
          const dmg = Math.floor((20 + boss.phase * 15) * (0.8 + Math.random() * 0.4));
          if (this.invincible <= 0) {
            this.playerHp -= dmg;
            this.invincible = 0.6;
            this.cameras.main.shake(200, 0.012);
            this.spawnDamageNumber(this.player.x, this.player.y - 50, dmg, false, "#ff4444");
            if (this.playerHp <= 0) this.killPlayer();
          }
        }
        // Phase 2+: also shoot fireballs
        if (boss.phase >= 2) {
          const fDir = boss.sprite.flipX ? -1 : 1;
          this.fireProjectile(fDir, 40 * boss.phase);
        }
      }

      // Player hits boss
      if (dist < 80 && this.attackCooldown <= 0) {
        // Already handled in doAttack()
      }

      // Draw HP bar
      this.drawBossHpBar(boss.hpBar, boss.hpBarBg, boss.hp, boss.maxHp, boss.zone.name);
    }
  }

  private hitBoss(boss: BossData, dmg: number) {
    boss.hp = Math.max(0, boss.hp - dmg);
    this.spawnDamageNumber(boss.sprite.x, boss.sprite.y - 50, dmg, true);
    if (boss.hp <= 0) {
      boss.alive = false;
      boss.sprite.play("dragon-attack");
      this.spawnExplosion(boss.sprite.x, boss.sprite.y);
      this.spawnExplosion(boss.sprite.x - 50, boss.sprite.y - 30);
      this.spawnExplosion(boss.sprite.x + 50, boss.sprite.y - 10);
      this.time.delayedCall(800, () => { boss.sprite.destroy(); boss.hpBar.destroy(); boss.hpBarBg.destroy(); });
      this.playerXp += 500;
      this.spawnFloatingText(boss.sprite.x, boss.sprite.y - 100, "BOSS DEFEATED! +500 XP", "#ffff00");
    }
  }

  private drawBossHpBar(bar: Phaser.GameObjects.Graphics, bg: Phaser.GameObjects.Graphics, hp: number, maxHp: number, name: string) {
    bg.clear(); bar.clear();
    const bw = 600; const bh = 22; const bx = (1280 - bw) / 2; const by = 70;
    bg.fillStyle(0x000000, 0.8); bg.fillRect(bx - 2, by - 2, bw + 4, bh + 4);
    bg.fillStyle(0x330000, 1); bg.fillRect(bx, by, bw, bh);
    bg.fillStyle(0xffffff, 0.3);
    bg.fillStyle(0x222222, 1); bg.fillRect(bx, by, bw, bh);
    if (!bg.getData("labeled")) {
      bg.setData("labeled", true);
      this.add.text(640, by - 18, `⚔️ ${name.replace("🔒 ", "")}`, {
        fontSize: "13px", color: "#ff4400", fontFamily: "monospace", align: "center"
      }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(27);
    }
    const pct = hp / maxHp;
    const barCol = pct > 0.5 ? 0xff6600 : pct > 0.25 ? 0xff3300 : 0xff0000;
    bar.fillStyle(barCol, 1); bar.fillRect(bx, by, Math.floor(bw * pct), bh);
    bar.fillStyle(0xffffff, 0.15); bar.fillRect(bx, by, Math.floor(bw * pct), 6);
  }

  // ─── BREAK WALLS ─────────────────────────────────────────────────────────
  private updateBreakWalls() {
    // Done via doAttack, just visual update
  }

  private hitBreakWall(bw: BreakWallObj) {
    bw.hitsLeft--;
    (bw.rect as any)._hits = bw.hitsLeft;
    bw.gfx.setAlpha(0.5 + (bw.hitsLeft / bw.def.hitsLeft) * 0.5);
    this.cameras.main.shake(100, 0.005);
    this.spawnFloatingText(bw.rect.x, bw.rect.y - 60, `${bw.hitsLeft} hits left!`, "#ffaa44");

    const hpLabel = (bw.rect as any)._hpLabel as Phaser.GameObjects.Text;
    if (hpLabel) {
      const filled = Math.ceil((bw.hitsLeft / bw.def.hitsLeft) * 5);
      hpLabel.setText("█".repeat(filled) + "░".repeat(5 - filled));
    }

    if (bw.hitsLeft <= 0) {
      // Reveal secret passage!
      bw.gfx.destroy();
      bw.rect.destroy();
      hpLabel?.destroy();
      this.spawnExplosion(bw.rect.x, bw.rect.y);
      this.spawnFloatingText(bw.def.revealX, bw.def.revealY - 40, "🔓 SECRET AREA UNLOCKED!", "#ff00ff");
      // Add shortcut marker
      const secretGfx = this.add.graphics().setDepth(8);
      secretGfx.fillStyle(0xff00ff, 0.4); secretGfx.fillRect(bw.def.revealX, bw.def.revealY - 20, 80, 20);
      secretGfx.lineStyle(2, 0xff00ff, 1); secretGfx.strokeRect(bw.def.revealX, bw.def.revealY - 20, 80, 20);
      this.add.text(bw.def.revealX + 40, bw.def.revealY - 10, "→ SECRET", {
        fontSize: "9px", color: "#ff00ff", fontFamily: "monospace"
      }).setOrigin(0.5).setDepth(9);
    }
  }

  // ─── PORTALS ─────────────────────────────────────────────────────────────
  private useCavePortal(_player: unknown, portal: unknown) {
    if (this.playerLayer === "cave") {
      const portalObj = portal as Phaser.Physics.Arcade.Image;
      const targetX = portalObj.x;
      this.teleportPlayer(targetX, SURFACE_GROUND - 100, "surface");
    }
  }

  private useHellPortal(_player: unknown, portal: unknown) {
    if (this.playerLayer === "hell") {
      const portalObj = portal as Phaser.Physics.Arcade.Image;
      const targetX = portalObj.x;
      this.teleportPlayer(targetX, CAVE_GROUND - 100, "cave");
    }
  }

  private teleportPlayer(x: number, y: number, layer: ZoneLayer) {
    this.player.setPosition(x, y);
    this.player.setVelocity(0, 0);
    this.playerLayer = layer;
    this.cameras.main.flash(300, 100, 100, 255);
    this.spawnFloatingText(x, y - 50, `Entered ${layer}!`, layer === "surface" ? "#00ffff" : layer === "cave" ? "#8855ff" : "#ff4400");
  }

  // ─── DIVE TRANSITIONS ────────────────────────────────────────────────────
  private updateDiveTransitions() {
    const px = this.player.x; const py = this.player.y;

    for (const pit of DIVE_PITS) {
      if (pit.fromLayer !== this.playerLayer) continue;
      const groundY = pit.fromLayer === "surface" ? SURFACE_GROUND : CAVE_GROUND;
      if (px >= pit.x && px <= pit.x + pit.w && py > groundY + 10) {
        // Player fell through pit!
        const toGroundY = pit.toLayer === "cave" ? CAVE_GROUND : HELL_GROUND;
        this.teleportPlayer(pit.toX + pit.w / 2, toGroundY - 120, pit.toLayer);
        break;
      }
    }
  }

  // ─── ZONE DISPLAY ────────────────────────────────────────────────────────
  private updateZoneDisplay() {
    const px = this.player.x;
    const currentZone = ZONES.find(z => z.layer === this.playerLayer && px >= z.x1 && px < z.x2);
    if (currentZone) {
      if (this.zoneLabel.text !== currentZone.name) {
        this.zoneLabel.setText(currentZone.name);
        if (currentZone.danger > 0) {
          this.zoneLabel.setText(`${currentZone.name} ⚠ Lv.${currentZone.danger}`);
        }
        this.onZoneChange(currentZone.name);
      }
    }
    const layerNames: Record<ZoneLayer, string> = { surface: "🌆 SURFACE", cave: "⛏ UNDERGROUND", hell: "🔥 HELL" };
    this.layerLabel.setText(layerNames[this.playerLayer]);
  }

  // ─── PLAYER DEATH ─────────────────────────────────────────────────────────
  private killPlayer() {
    if (!this.isAlive) return;
    this.isAlive = false;
    this.playerHp = 0;
    this.player.setVelocity(0);
    const sk = this.playerClass.spriteKey;
    if (sk === "knight" && this.anims.exists("knight-die")) this.player.play("knight-die");
    this.respawnText.setVisible(true).setText("DEFEATED!\nRespawning in 4s...");
    this.respawnTimer = 4;
    this.onPlayerDied();
  }

  private handleRespawn(dt: number) {
    this.respawnTimer -= dt;
    if (this.respawnTimer > 0) {
      this.respawnText.setText(`DEFEATED!\nRespawning in ${Math.ceil(this.respawnTimer)}s...`);
    } else {
      this.isAlive = true;
      this.playerHp = this.playerMaxHp;
      this.playerMp = 100;
      this.player.setPosition(200, SURFACE_GROUND - 80);
      this.playerLayer = "surface";
      this.respawnText.setVisible(false);
      const sk = this.playerClass.spriteKey;
      if (sk === "knight") this.player.play("knight-idle");
      else if (this.anims.exists(`${sk}-idle`)) this.player.play(`${sk}-idle`);
    }
  }

  // ─── COLLECT COIN ─────────────────────────────────────────────────────────
  private collectCoin(_player: unknown, coin: unknown) {
    const c = coin as Phaser.Physics.Arcade.Sprite;
    this.playerXp += 5;
    this.spawnFloatingText(c.x, c.y - 30, "+5 XP", "#ffdd00");
    c.destroy();
  }

  // ─── PROJECTILES ─────────────────────────────────────────────────────────
  private updateProjectiles(dt: number) {
    for (const proj of this.projectiles.getChildren() as Phaser.Physics.Arcade.Image[]) {
      if (!proj.active) continue;
      const age = (this.time.now - (proj as any)._born) / 1000;
      if (age > 2) { proj.destroy(); continue; }
      for (const en of this.enemies) {
        if (en.state === "dead" || en.layer !== this.playerLayer) continue;
        if (Math.abs(en.sprite.x - proj.x) < 30 && Math.abs(en.sprite.y - proj.y) < 30) {
          this.hitEnemy(en, (proj as any)._dmg, false);
          proj.destroy();
          break;
        }
      }
      for (const boss of this.bosses) {
        if (!boss.alive) continue;
        if (Math.abs(boss.sprite.x - proj.x) < 60 && Math.abs(boss.sprite.y - proj.y) < 60) {
          this.hitBoss(boss, (proj as any)._dmg);
          proj.destroy();
          break;
        }
      }
    }
    dt; // suppress unused
  }

  // ─── MP REGEN ─────────────────────────────────────────────────────────────
  private updateMpRegen(dt: number) {
    this.playerMp = Math.min(this.playerMaxMp, this.playerMp + dt * 4);
  }

  // ─── STATS EMIT ──────────────────────────────────────────────────────────
  private emitStats() {
    this.onStatsUpdate(
      Math.max(0, this.playerHp), this.playerMaxHp,
      Math.floor(this.playerMp), this.playerMaxMp,
      this.playerXp, this.playerLevel, this.playerKills,
      this.playerLayer
    );
  }

  // ─── DAMAGE NUMBERS ──────────────────────────────────────────────────────
  private spawnDamageNumber(x: number, y: number, dmg: number, crit: boolean, col = "") {
    const color = col || (crit ? "#ffff00" : "#ffffff");
    const txt = this.add.text(x + Phaser.Math.Between(-20, 20), y, (crit ? "⚡" : "") + dmg, {
      fontSize: crit ? "20px" : "14px", color, fontFamily: "monospace",
      stroke: "#000000", strokeThickness: 3
    }).setDepth(20);
    this.damageNumbers.push({ text: txt, vy: -120 - Math.random() * 40, life: 0.9 });
  }

  private spawnFloatingText(x: number, y: number, msg: string, color = "#ffffff") {
    const txt = this.add.text(x, y, msg, {
      fontSize: "13px", color, fontFamily: "monospace",
      stroke: "#000000", strokeThickness: 3, backgroundColor: "#00000055"
    }).setOrigin(0.5).setDepth(21);
    this.floatingTexts.push({ text: txt, vy: -60, life: 1.8 });
  }

  private updateDamageNumbers(dt: number) {
    for (const dn of [...this.damageNumbers]) {
      dn.text.y += dn.vy * dt; dn.vy += 50 * dt; dn.life -= dt;
      dn.text.setAlpha(Math.max(0, dn.life));
      if (dn.life <= 0) { dn.text.destroy(); this.damageNumbers.splice(this.damageNumbers.indexOf(dn), 1); }
    }
    for (const ft of [...this.floatingTexts]) {
      ft.text.y += ft.vy * dt; ft.life -= dt;
      ft.text.setAlpha(Math.max(0, ft.life));
      if (ft.life <= 0) { ft.text.destroy(); this.floatingTexts.splice(this.floatingTexts.indexOf(ft), 1); }
    }
  }

  // ─── EXPLOSION EFFECT ────────────────────────────────────────────────────
  private spawnExplosion(x: number, y: number) {
    if (!this.textures.exists("explosion")) return;
    const e = this.add.sprite(x, y, "explosion").setDepth(15).setScale(1.2);
    e.play("explode");
    e.once("animationcomplete", () => e.destroy());
  }
}

// ─── REACT HUD TYPES ─────────────────────────────────────────────────────────
interface HUDState {
  hp: number; maxHp: number; mp: number; maxMp: number;
  xp: number; level: number; kills: number; layer: ZoneLayer;
}

// ─── REACT COMPONENT ─────────────────────────────────────────────────────────
export default function OGWorld() {
  const [, setLocation] = useLocation();
  const [selectedClass, setSelectedClass] = useState<CharClass | null>(() => {
    const stored = sessionStorage.getItem("og_world_origin") as CharClass | null;
    return stored && Object.keys(CLASSES).includes(stored) ? stored : null;
  });
  const [username] = useState(() => localStorage.getItem("og_username") || `Player${Math.floor(Math.random()*9999)}`);
  const [hud, setHud] = useState<HUDState>({ hp: 100, maxHp: 100, mp: 100, maxMp: 100, xp: 0, level: 1, kills: 0, layer: "surface" });
  const [zone, setZone] = useState("Bahamas City");
  const [chat, setChat] = useState<{ user: string; msg: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [online, setOnline] = useState(1);
  const [bossLock, setBossLock] = useState<{ needed: number; have: number; zone: string } | null>(null);
  const [died, setDied] = useState(false);
  const [skillCDs] = useState([0, 0, 0]);

  const gameRef = useRef<Phaser.Game | null>(null);
  const channelRef = useRef<ReturnType<NonNullable<typeof supabase>["channel"]> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const onlineRef = useRef(1);

  const handleChat = useCallback((msg: string) => {
    channelRef.current?.send({ type: "broadcast", event: "chat", payload: { user: username, msg } });
  }, [username]);

  useEffect(() => {
    if (!selectedClass || !containerRef.current || gameRef.current) return;

    _sceneInitData = {
      playerClass: selectedClass,
      username,
      onPlayerDied:  () => setDied(true),
      onZoneChange:  (z) => setZone(z),
      onStatsUpdate: (hp, maxHp, mp, maxMp, xp, level, kills, layer) =>
        setHud({ hp, maxHp, mp, maxMp, xp, level, kills, layer }),
      onBossLock:    (needed, have, zone) => setBossLock({ needed, have, zone }),
      onBossUnlock:  () => setBossLock(null),
      onlineCount:   onlineRef.current,
    };

    const w = containerRef.current.clientWidth || 1280;
    const h = containerRef.current.clientHeight || 640;

    gameRef.current = new Phaser.Game({
      type: Phaser.AUTO,
      width: w, height: h,
      backgroundColor: "#0a0a14",
      parent: containerRef.current,
      physics: { default: "arcade", arcade: { gravity: { y: 500, x: 0 }, debug: false } },
      scene: [OGWorldScene],
    });

    // Supabase multiplayer
    if (isSupabaseConfigured && supabase) {
      const ch = supabase.channel("og-world-3d-v3");
      channelRef.current = ch;
      ch.on("presence", { event: "sync" }, () => {
        const count = Object.keys(ch.presenceState()).length;
        setOnline(count); onlineRef.current = count;
        if (_sceneInitData) _sceneInitData.onlineCount = count;
      });
      ch.on("broadcast", { event: "chat" }, ({ payload }: { payload: { user: string; msg: string } }) =>
        setChat(c => [...c.slice(-30), payload])
      );
      ch.on("broadcast", { event: "boss_spawned" }, ({ payload }: { payload: { zone: string } }) =>
        setChat(c => [...c, { user: "⚠️ SERVER", msg: `BOSS SPAWNED in ${payload.zone}!` }])
      );
      ch.subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await ch.track({ id: username, username, class: selectedClass });
        }
      });
    }

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
      channelRef.current?.unsubscribe();
      channelRef.current = null;
      _sceneInitData = null;
    };
  }, [selectedClass, username]);

  // CLASS SELECT SCREEN
  if (!selectedClass) {
    return (
      <div style={{ width: "100vw", height: "100vh", background: "linear-gradient(180deg,#0a0a1e,#1a0a2e)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "monospace" }}>
        <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: "center", marginBottom: 32 }}>
          <h1 style={{ fontSize: 42, fontWeight: 900, color: "#00ffff", textShadow: "0 0 20px #00ffff", margin: 0 }}>⚔️ OG WORLD</h1>
          <p style={{ color: "#8888aa", fontSize: 14, marginTop: 8 }}>Three layers. Infinite secrets. Choose your warrior.</p>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 12 }}>
            <span style={{ color: "#00ffff", fontSize: 12 }}>🌆 Surface</span>
            <span style={{ color: "#8855ff", fontSize: 12 }}>⛏ Underground</span>
            <span style={{ color: "#ff4400", fontSize: 12 }}>🔥 Hell</span>
          </div>
        </motion.div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 200px)", gap: 16 }}>
          {(Object.entries(CLASSES) as [CharClass, ClassData][]).map(([cls, data], i) => (
            <motion.button key={cls}
              initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
              whileHover={{ scale: 1.07, y: -4 }} whileTap={{ scale: 0.96 }}
              onClick={() => setSelectedClass(cls)}
              style={{
                background: "linear-gradient(135deg,#0a0a2a,#1a1a3a)",
                border: `2px solid #${((data.tint & 0xffffff).toString(16)).padStart(6, "0")}88`,
                borderRadius: 12, padding: "20px 16px", cursor: "pointer",
                color: "#ffffff", textAlign: "center",
                boxShadow: `0 0 20px #${((data.tint & 0xffffff).toString(16)).padStart(6, "0")}22`,
              }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>{data.icon}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: `#${((data.tint & 0xffffff).toString(16)).padStart(6, "0")}` }}>{cls}</div>
              <div style={{ fontSize: 11, color: "#aaaacc", margin: "6px 0" }}>{data.desc}</div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#888" }}>
                <span>HP:{data.hp}</span><span>ATK:{data.atk}</span><span>SPD:{data.speed}</span>
              </div>
              <div style={{ marginTop: 10, fontSize: 9, color: "#666" }}>
                {data.skills.map((s, i) => <div key={i}>{["Q","E","R"][i]}: {s}</div>)}
              </div>
            </motion.button>
          ))}
        </div>
        <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.6 } }}
          whileHover={{ scale: 1.05 }} onClick={() => setLocation("/")}
          style={{ marginTop: 24, background: "none", border: "1px solid #334", color: "#556", padding: "8px 20px", borderRadius: 8, cursor: "pointer", fontFamily: "monospace", fontSize: 12 }}>
          ← Back to City
        </motion.button>
      </div>
    );
  }

  const cd = CLASSES[selectedClass];
  const hpPct  = (hud.hp  / hud.maxHp)  * 100;
  const mpPct  = (hud.mp  / hud.maxMp)  * 100;
  const xpPct  = (hud.xp  % (hud.level * 100)) / (hud.level * 100) * 100;
  const layerColors: Record<ZoneLayer, string> = { surface: "#00ffff", cave: "#8855ff", hell: "#ff4400" };

  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden", position: "relative", background: "#000" }}>
      {/* Game canvas */}
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

      {/* TOP HUD */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, padding: "10px 16px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", pointerEvents: "none", zIndex: 10 }}>
        {/* Left: Player stats */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 220 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: `#${((cd.tint & 0xffffff).toString(16)).padStart(6,"0")}`, fontSize: 13, fontFamily: "monospace" }}>{cd.icon} {selectedClass}</span>
            <span style={{ color: "#ffff88", fontSize: 12, fontFamily: "monospace" }}>Lv.{hud.level}</span>
            <span style={{ color: layerColors[hud.layer], fontSize: 11, fontFamily: "monospace" }}>
              {hud.layer === "surface" ? "🌆" : hud.layer === "cave" ? "⛏" : "🔥"} {hud.layer.toUpperCase()}
            </span>
          </div>
          {/* HP */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: "#ff4444", fontSize: 10, fontFamily: "monospace", width: 22 }}>HP</span>
            <div style={{ width: 180, height: 10, background: "#220000", borderRadius: 5, overflow: "hidden" }}>
              <div style={{ width: `${hpPct}%`, height: "100%", background: hpPct > 50 ? "#44cc44" : hpPct > 25 ? "#ffaa00" : "#ff2222", transition: "width 0.15s", borderRadius: 5 }} />
            </div>
            <span style={{ color: "#88ff88", fontSize: 9, fontFamily: "monospace" }}>{hud.hp}/{hud.maxHp}</span>
          </div>
          {/* MP */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: "#4488ff", fontSize: 10, fontFamily: "monospace", width: 22 }}>MP</span>
            <div style={{ width: 180, height: 8, background: "#000022", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ width: `${mpPct}%`, height: "100%", background: "#2266ff", transition: "width 0.2s", borderRadius: 4 }} />
            </div>
            <span style={{ color: "#88aaff", fontSize: 9, fontFamily: "monospace" }}>{Math.floor(hud.mp)}/{hud.maxMp}</span>
          </div>
          {/* XP */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: "#ffdd44", fontSize: 10, fontFamily: "monospace", width: 22 }}>XP</span>
            <div style={{ width: 180, height: 6, background: "#221100", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ width: `${xpPct}%`, height: "100%", background: "#ffcc00", transition: "width 0.3s", borderRadius: 3 }} />
            </div>
          </div>
        </div>

        {/* Center: Zone + online */}
        <div style={{ textAlign: "center", fontFamily: "monospace" }}>
          <div style={{ color: layerColors[hud.layer], fontSize: 13, textShadow: `0 0 8px ${layerColors[hud.layer]}` }}>{zone}</div>
          <div style={{ color: "#556", fontSize: 10 }}>🌐 {online} online</div>
        </div>

        {/* Right: Stats + exit */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, pointerEvents: "all" }}>
          <button onClick={() => setLocation("/")}
            style={{ background: "none", border: "1px solid #334", color: "#556", padding: "4px 10px", borderRadius: 6, cursor: "pointer", fontFamily: "monospace", fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
            <LogOut size={12} /> Exit
          </button>
          <div style={{ color: "#ffdd44", fontSize: 11, fontFamily: "monospace" }}>⚔️ {hud.kills} kills</div>
          <div style={{ color: "#aaaacc", fontSize: 10, fontFamily: "monospace" }}>XP: {hud.xp}</div>
        </div>
      </div>

      {/* SKILL BAR */}
      <div style={{ position: "absolute", bottom: 90, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 10, zIndex: 10, pointerEvents: "none" }}>
        {cd.skills.map((skill, i) => {
          const cd2 = skillCDs[i]; const icon = ["Q","E","R"][i];
          return (
            <div key={i} style={{
              width: 62, height: 62, background: "#0a0a1a", border: `2px solid ${cd2 > 0 ? "#334" : "#00ffff44"}`,
              borderRadius: 8, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative"
            }}>
              <span style={{ color: "#00ffff", fontSize: 11, fontWeight: 700, fontFamily: "monospace" }}>[{icon}]</span>
              <span style={{ color: "#aaaacc", fontSize: 8, fontFamily: "monospace", textAlign: "center", padding: "0 2px" }}>{skill.slice(0,10)}</span>
              {cd2 > 0 && (
                <div style={{ position: "absolute", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 6 }}>
                  <span style={{ color: "#ff8888", fontSize: 13, fontFamily: "monospace" }}>{cd2.toFixed(1)}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* CONTROLS HINT */}
      <div style={{ position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)", color: "#334", fontSize: 10, fontFamily: "monospace", textAlign: "center", zIndex: 10, pointerEvents: "none" }}>
        WASD/Arrows: Move  |  W/Space: Jump  |  F/Click: Attack  |  Q E R: Skills  |  Shift: Sprint  |  ↓ Pit: Go Underground  |  Portal: Return
      </div>

      {/* BOSS LOCK OVERLAY */}
      <AnimatePresence>
        {bossLock && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: "#0a0005dd", border: "2px solid #ff2200", borderRadius: 16, padding: "24px 40px", textAlign: "center", zIndex: 50, pointerEvents: "none" }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🔒</div>
            <div style={{ color: "#ff4400", fontSize: 18, fontFamily: "monospace", fontWeight: 700 }}>{bossLock.zone}</div>
            <div style={{ color: "#ff8844", fontSize: 14, fontFamily: "monospace", marginTop: 8 }}>BOSS GATE LOCKED</div>
            <div style={{ color: "#ffffff", fontSize: 13, fontFamily: "monospace", marginTop: 12 }}>
              <Users size={14} style={{ display: "inline", marginRight: 6 }} />
              {bossLock.have} / {bossLock.needed} warriors online
            </div>
            <div style={{ marginTop: 12, display: "flex", gap: 8, justifyContent: "center" }}>
              {Array.from({ length: bossLock.needed }).map((_, i) => (
                <Shield key={i} size={14} color={i < bossLock.have ? "#44ff44" : "#334"} />
              ))}
            </div>
            <div style={{ color: "#666", fontSize: 11, fontFamily: "monospace", marginTop: 10 }}>Gather {bossLock.needed - bossLock.have} more players to unlock</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DEATH OVERLAY */}
      <AnimatePresence>
        {died && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "absolute", inset: 0, background: "#ff000011", pointerEvents: "none", zIndex: 40 }}
            onAnimationComplete={() => setTimeout(() => setDied(false), 3800)}
          />
        )}
      </AnimatePresence>

      {/* CHAT */}
      <div style={{ position: "absolute", bottom: 56, right: 16, width: 260, zIndex: 10 }}>
        <div style={{ background: "#0a0a1488", borderRadius: "8px 8px 0 0", padding: "6px 10px", maxHeight: 120, overflowY: "auto", fontFamily: "monospace" }}>
          {chat.slice(-8).map((m, i) => (
            <div key={i} style={{ fontSize: 10, color: "#aaaacc", marginBottom: 2 }}>
              <span style={{ color: "#00ffff" }}>{m.user}: </span>{m.msg}
            </div>
          ))}
        </div>
        <div style={{ display: "flex" }}>
          <input value={chatInput} onChange={e => setChatInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && chatInput.trim()) { handleChat(chatInput.trim()); setChatInput(""); } }}
            placeholder="Type & Enter to chat..." maxLength={80}
            style={{ flex: 1, background: "#0a0a14", border: "1px solid #223", borderTop: "none", color: "#fff", padding: "4px 8px", fontFamily: "monospace", fontSize: 11, outline: "none", borderRadius: "0 0 0 8px" }} />
          <button onClick={() => { if (chatInput.trim()) { handleChat(chatInput.trim()); setChatInput(""); } }}
            style={{ background: "#00ffff22", border: "1px solid #223", borderTop: "none", borderLeft: "none", color: "#00ffff", padding: "4px 10px", cursor: "pointer", fontFamily: "monospace", fontSize: 11, borderRadius: "0 0 8px 0" }}>→</button>
        </div>
      </div>

      {/* LAYER INFO */}
      <div style={{ position: "absolute", top: 120, right: 16, display: "flex", flexDirection: "column", gap: 6, zIndex: 10, pointerEvents: "none" }}>
        {[
          { layer: "surface" as ZoneLayer, icon: "🌆", label: "Surface",     color: "#00ffff" },
          { layer: "cave"    as ZoneLayer, icon: "⛏",  label: "Underground", color: "#8855ff" },
          { layer: "hell"    as ZoneLayer, icon: "🔥", label: "Hell",        color: "#ff4400" },
        ].map(({ layer, icon, label, color }) => (
          <div key={layer} style={{
            display: "flex", alignItems: "center", gap: 6, fontFamily: "monospace", fontSize: 11,
            color: hud.layer === layer ? color : "#334",
            textShadow: hud.layer === layer ? `0 0 6px ${color}` : "none",
          }}>
            <span>{icon}</span><span>{label}</span>
            {hud.layer === layer && <span style={{ color }}>◀</span>}
          </div>
        ))}
        <div style={{ color: "#334", fontSize: 9, marginTop: 4 }}>↓ Pit = go deeper</div>
        <div style={{ color: "#334", fontSize: 9 }}>Portal = go back</div>
      </div>

      {/* BOSS COUNT MINI */}
      <div style={{ position: "absolute", top: 120, left: 16, fontFamily: "monospace", zIndex: 10, pointerEvents: "none" }}>
        <div style={{ color: "#ff4400", fontSize: 10, display: "flex", alignItems: "center", gap: 4 }}>
          <Skull size={11} />
          <span>Boss gates need 10 players</span>
        </div>
        <div style={{ color: "#ff6622", fontSize: 10, display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
          <Flame size={11} />
          <span>Break walls to find secrets!</span>
        </div>
      </div>
    </div>
  );
}
