import { useEffect, useRef, useState, useCallback } from "react";
import Phaser from "phaser";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { LogOut, Users } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type MonsterType = "troll" | "ghost" | "guard" | "spambot" | "iceling" | "slime";
type ClassName = "Tank" | "Assassin" | "Mage" | "Ranger" | "Berserker" | "Paladin";

type SkillDef = {
  key: string; label: string; color: string; dmgMult: number; cooldown: number;
};

type DmgNumber = {
  id: number; x: number; y: number; val: number; crit: boolean; born: number;
};

type ChatMsg = { username: string; text: string; id: number };

type EnemyData = {
  id: number;
  type: MonsterType;
  sprite: Phaser.Physics.Arcade.Sprite;
  hpBar: Phaser.GameObjects.Graphics;
  hp: number;
  maxHp: number;
  alive: boolean;
  spawnX: number;
  lastAtk: number;
  lastPatrol: number;
  patrolDir: number;
  aggro: boolean;
  dead: boolean;
  deadTime: number;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const WORLD_W = 8000;
const WORLD_H = 580;
const GROUND_Y = 480;
const PLAYER_SPEED = 210;
const SPRINT_MULT = 1.75;
const JUMP_VEL = -520;
const GRAVITY_VAL = 950;
const ATTACK_RANGE = 120;
const RESPAWN_MS = 12000;

const MON_SPEED: Record<MonsterType, number> = { troll: 75, ghost: 50, guard: 68, spambot: 105, iceling: 42, slime: 72 };
const MON_DMG:   Record<MonsterType, number> = { troll: 8,  ghost: 14, guard: 16, spambot: 6,   iceling: 11, slime: 7  };
const MON_HP:    Record<MonsterType, number> = { troll: 60, ghost: 85, guard: 140,spambot: 45,  iceling: 75, slime: 55 };
const MON_XP:    Record<MonsterType, number> = { troll: 15, ghost: 25, guard: 40, spambot: 12,  iceling: 20, slime: 14 };
const MON_W:     Record<MonsterType, number> = { troll: 38, ghost: 36, guard: 34, spambot: 32,  iceling: 34, slime: 40 };
const MON_H:     Record<MonsterType, number> = { troll: 54, ghost: 48, guard: 58, spambot: 50,  iceling: 52, slime: 36 };

const MON_COLOR: Record<MonsterType, number> = {
  troll: 0xff2d8c, ghost: 0x3df7ff, guard: 0xffd600,
  spambot: 0x39ff14, iceling: 0xc0e8ff, slime: 0xbd93f9,
};
const MON_AGGRO: Record<MonsterType, number> = {
  troll: 300, ghost: 260, guard: 220, spambot: 340, iceling: 200, slime: 260,
};
const MON_ATK_RANGE: Record<MonsterType, number> = {
  troll: 70, ghost: 80, guard: 65, spambot: 90, iceling: 60, slime: 65,
};

const CLASS_HP: Record<ClassName, number>  = { Tank: 300, Assassin: 160, Mage: 180, Ranger: 200, Berserker: 220, Paladin: 250 };
const CLASS_ATK: Record<ClassName, number> = { Tank: 25,  Assassin: 45,  Mage: 38,  Ranger: 32,  Berserker: 50,  Paladin: 28  };
const CLASS_COL: Record<ClassName, number> = {
  Tank: 0x90a4ae, Assassin: 0x9c27b0, Mage: 0xaa00ff,
  Ranger: 0x76c442, Berserker: 0xff3d00, Paladin: 0xffd600,
};
const CLASS_COL_HEX: Record<ClassName, string> = {
  Tank: "#90a4ae", Assassin: "#9c27b0", Mage: "#aa00ff",
  Ranger: "#76c442", Berserker: "#ff3d00", Paladin: "#ffd600",
};

const CLASS_SKILLS: Record<string, SkillDef[]> = {
  Tank:     [{ key:"Q", label:"Shield Bash",   color:"#90a4ae", dmgMult:1.4, cooldown:4  },
             { key:"E", label:"Shockwave",     color:"#607d8b", dmgMult:0.9, cooldown:8  },
             { key:"R", label:"Iron Fortress", color:"#cfd8dc", dmgMult:2.5, cooldown:20 }],
  Assassin: [{ key:"Q", label:"Backstab",    color:"#7c4dff", dmgMult:2.2, cooldown:5  },
             { key:"E", label:"Shadow Step", color:"#4a0080", dmgMult:1.5, cooldown:10 },
             { key:"R", label:"Death Mark",  color:"#e040fb", dmgMult:3.5, cooldown:25 }],
  Mage:     [{ key:"Q", label:"Fireball",    color:"#ff6d00", dmgMult:1.8, cooldown:3  },
             { key:"E", label:"Blizzard",    color:"#80d8ff", dmgMult:1.2, cooldown:10 },
             { key:"R", label:"Arcane Nuke", color:"#aa00ff", dmgMult:4.0, cooldown:28 }],
  Ranger:   [{ key:"Q", label:"Arrow Shot",     color:"#76c442", dmgMult:1.6, cooldown:3  },
             { key:"E", label:"Rain of Arrows", color:"#388e3c", dmgMult:1.0, cooldown:12 },
             { key:"R", label:"Eagle Strike",   color:"#b8ff59", dmgMult:3.2, cooldown:22 }],
  Berserker:[{ key:"Q", label:"Whirlwind",      color:"#ff3d00", dmgMult:1.3, cooldown:6  },
             { key:"E", label:"Bloodthirst",    color:"#b71c1c", dmgMult:1.8, cooldown:10 },
             { key:"R", label:"Berserker Rage", color:"#ff6e40", dmgMult:3.8, cooldown:30 }],
  Paladin:  [{ key:"Q", label:"Holy Strike",  color:"#ffd600", dmgMult:1.5, cooldown:4  },
             { key:"E", label:"Consecration", color:"#ffab00", dmgMult:1.0, cooldown:12 },
             { key:"R", label:"Divine Wrath", color:"#fff9c4", dmgMult:3.0, cooldown:24 }],
};

const ZONES = [
  { name:"Bahamas City",     color:"#ffd600", danger:"Safe Zone",   xStart:0,    xEnd:1400 },
  { name:"Bahamas Plains",   color:"#76c442", danger:"Danger Lv.1", xStart:1400, xEnd:2400 },
  { name:"Troll Dimension",  color:"#ff2d8c", danger:"Danger Lv.5", xStart:2400, xEnd:3600 },
  { name:"Exile Forest",     color:"#3df7ff", danger:"Danger Lv.3", xStart:3600, xEnd:4800 },
  { name:"Banned Tundra",    color:"#80d8ff", danger:"Danger Lv.3", xStart:4800, xEnd:5800 },
  { name:"Spam Swamp",       color:"#39ff14", danger:"Danger Lv.3", xStart:5800, xEnd:6800 },
  { name:"Stream Colosseum", color:"#bd93f9", danger:"Danger Lv.4", xStart:6800, xEnd:8000 },
];

const ENEMY_SPAWNS: { id:number; type:MonsterType; x:number }[] = [
  { id:1,  type:"guard",   x:700  }, { id:2,  type:"guard",   x:1000 },
  { id:3,  type:"slime",   x:1500 }, { id:4,  type:"slime",   x:1700 }, { id:5,  type:"troll",   x:1900 },
  { id:6,  type:"slime",   x:2100 }, { id:7,  type:"troll",   x:2300 },
  { id:8,  type:"troll",   x:2550 }, { id:9,  type:"troll",   x:2800 }, { id:10, type:"troll",   x:3100 },
  { id:11, type:"troll",   x:3300 }, { id:12, type:"troll",   x:3480 },
  { id:13, type:"ghost",   x:3700 }, { id:14, type:"ghost",   x:3950 }, { id:15, type:"iceling", x:4100 },
  { id:16, type:"ghost",   x:4300 }, { id:17, type:"iceling", x:4600 },
  { id:18, type:"iceling", x:4900 }, { id:19, type:"iceling", x:5100 }, { id:20, type:"iceling", x:5400 },
  { id:21, type:"troll",   x:5600 },
  { id:22, type:"spambot", x:5900 }, { id:23, type:"spambot", x:6100 }, { id:24, type:"spambot", x:6400 },
  { id:25, type:"spambot", x:6600 },
  { id:26, type:"guard",   x:6900 }, { id:27, type:"ghost",   x:7100 }, { id:28, type:"troll",   x:7300 },
  { id:29, type:"spambot", x:7500 }, { id:30, type:"slime",   x:7700 },
];

// Zone sign positions
const ZONE_SIGNS: { x:number; label:string; color:number }[] = [
  { x:1380,  label:"BAHAMAS PLAINS ▶",   color:0x76c442 },
  { x:2380,  label:"TROLL DIMENSION ▶",  color:0xff2d8c },
  { x:3580,  label:"EXILE FOREST ▶",     color:0x3df7ff },
  { x:4780,  label:"BANNED TUNDRA ▶",    color:0x80d8ff },
  { x:5780,  label:"SPAM SWAMP ▶",       color:0x39ff14 },
  { x:6780,  label:"STREAM COLOSSEUM ▶", color:0xbd93f9 },
];

// ─── Module-level scene data store (avoids closure issues) ───────────────────

type SceneInitData = {
  onHpChange: (hp: number) => void;
  onMpChange: (mp: number) => void;
  onXpChange: (xp: number) => void;
  onKillsChange: (k: number) => void;
  onDmgNumber: (x: number, y: number, val: number, crit: boolean) => void;
  onPlayerHit: (dmg: number) => void;
  onZoneChange: (zone: typeof ZONES[0]) => void;
  onSkillFire: (idx: number) => void;
  onChat: (text: string) => void;
  hp: number; maxHp: number; playerClass: ClassName;
};
let _sceneInitData: SceneInitData | null = null;

// ─── PHASER SCENE ─────────────────────────────────────────────────────────────

class OGWorldScene extends Phaser.Scene {
  constructor() {
    super({ key: "OGWorldScene" });
  }
  // player
  player!: Phaser.Physics.Arcade.Sprite;
  playerBody!: Phaser.GameObjects.Graphics;
  cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  keyA!: Phaser.Input.Keyboard.Key;
  keyD!: Phaser.Input.Keyboard.Key;
  keyW!: Phaser.Input.Keyboard.Key;
  keyS!: Phaser.Input.Keyboard.Key;
  keyF!: Phaser.Input.Keyboard.Key;
  keyShift!: Phaser.Input.Keyboard.Key;
  keyQ!: Phaser.Input.Keyboard.Key;
  keyE!: Phaser.Input.Keyboard.Key;
  keyR!: Phaser.Input.Keyboard.Key;
  facingRight: boolean = true;

  // Ground
  groundGroup!: Phaser.Physics.Arcade.StaticGroup;

  // Parallax bg layers
  bgSky!: Phaser.GameObjects.TileSprite;
  bgFarCity!: Phaser.GameObjects.TileSprite;
  bgMidCity!: Phaser.GameObjects.TileSprite;

  // Enemies
  enemies: EnemyData[] = [];
  enemyGroup!: Phaser.Physics.Arcade.Group;

  // Ground decorations (drawn into graphics)
  groundGfx!: Phaser.GameObjects.Graphics;

  // Attack flash
  attackFlashGfx!: Phaser.GameObjects.Graphics;
  attackFlashTimer: number = 0;

  // Callbacks to React
  onHpChange!: (hp: number) => void;
  onMpChange!: (mp: number) => void;
  onXpChange!: (xp: number) => void;
  onKillsChange!: (k: number) => void;
  onDmgNumber!: (x: number, y: number, val: number, crit: boolean) => void;
  onPlayerHit!: (dmg: number) => void;
  onZoneChange!: (zone: typeof ZONES[0]) => void;
  onSkillFire!: (idx: number) => void;
  onChat!: (text: string) => void;

  // State mirrored from React
  playerHp!: number;
  playerMaxHp!: number;
  playerMp: number = 100;
  playerMaxMp: number = 100;
  playerXp: number = 0;
  kills: number = 0;
  playerClass!: ClassName;
  playerColor!: number;
  playerAtk!: number;
  skills!: SkillDef[];
  skillCooldowns: number[] = [0, 0, 0];
  dead: boolean = false;
  lastPlayerAtk: number = 0;
  currentZoneIdx: number = 0;
  mpRegenTimer: number = 0;
  lastPlayerHit: number = 0;

  // Attack indicators (projectile-like effects)
  attackEffects: { gfx: Phaser.GameObjects.Graphics; x: number; vx: number; born: number; size: number; color: number }[] = [];

  preload() {
    // All textures generated programmatically — no file loading needed
  }

  init(_data: unknown) {
    // Read from module-level store (set before game creation)
    const data = _sceneInitData!;
    this.onHpChange = data.onHpChange;
    this.onMpChange = data.onMpChange;
    this.onXpChange = data.onXpChange;
    this.onKillsChange = data.onKillsChange;
    this.onDmgNumber = data.onDmgNumber;
    this.onPlayerHit = data.onPlayerHit;
    this.onZoneChange = data.onZoneChange;
    this.onSkillFire = data.onSkillFire;
    this.onChat = data.onChat;
    this.playerHp = data.hp;
    this.playerMaxHp = data.maxHp;
    this.playerClass = data.playerClass;
    this.playerColor = CLASS_COL[data.playerClass] ?? 0x90a4ae;
    this.playerAtk = CLASS_ATK[data.playerClass] ?? 25;
    this.skills = CLASS_SKILLS[data.playerClass] ?? CLASS_SKILLS.Tank;
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    this.physics.world.gravity.y = GRAVITY_VAL;
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H + 100);

    // ── Generate textures ──────────────────────────────────────────────────────
    this.generateTextures();

    // ── Sky background ─────────────────────────────────────────────────────────
    this.bgSky = this.add.tileSprite(0, 0, W, H, "bg_sky")
      .setOrigin(0, 0).setScrollFactor(0).setDepth(0);

    // ── Far city parallax ──────────────────────────────────────────────────────
    this.bgFarCity = this.add.tileSprite(0, H - 280, WORLD_W, 280, "bg_far_city")
      .setOrigin(0, 0).setScrollFactor(0).setDepth(1);

    // ── Near city parallax ─────────────────────────────────────────────────────
    this.bgMidCity = this.add.tileSprite(0, H - 200, WORLD_W, 200, "bg_mid_city")
      .setOrigin(0, 0).setScrollFactor(0).setDepth(2);

    // ── Draw static ground across full world width ────────────────────────────
    this.groundGfx = this.add.graphics().setDepth(3);
    this.drawGround();

    // ── Zone signs ─────────────────────────────────────────────────────────────
    for (const sign of ZONE_SIGNS) {
      this.drawZoneSign(sign.x, sign.label, sign.color);
    }

    // ── Building decorations ───────────────────────────────────────────────────
    this.drawCityBuildings();

    // ── Ground physics ─────────────────────────────────────────────────────────
    this.groundGroup = this.physics.add.staticGroup();
    const groundPhys = this.groundGroup.create(WORLD_W / 2, GROUND_Y + 40, "__DEFAULT") as Phaser.Physics.Arcade.Sprite;
    groundPhys.setVisible(false).refreshBody();
    (groundPhys.body as Phaser.Physics.Arcade.StaticBody).setSize(WORLD_W, 80);

    // ── Platform blocks (for some zones) ──────────────────────────────────────
    this.addPlatform(2600, GROUND_Y - 80, 180, 22, 0x3a0055);
    this.addPlatform(2900, GROUND_Y - 130, 160, 22, 0x3a0055);
    this.addPlatform(3200, GROUND_Y - 80, 180, 22, 0x3a0055);
    this.addPlatform(4200, GROUND_Y - 100, 200, 22, 0x003a3a);
    this.addPlatform(4500, GROUND_Y - 160, 160, 22, 0x003a3a);
    this.addPlatform(6000, GROUND_Y - 90, 180, 22, 0x003a00);
    this.addPlatform(7200, GROUND_Y - 110, 200, 22, 0x1a0050);

    // ── Player ─────────────────────────────────────────────────────────────────
    this.player = this.physics.add.sprite(160, GROUND_Y - 80, `player_${this.playerClass}`);
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(10);
    this.player.setGravityY(0);
    this.physics.add.collider(this.player, this.groundGroup);

    // ── Enemy group ────────────────────────────────────────────────────────────
    this.enemyGroup = this.physics.add.group();
    this.spawnAllEnemies();
    this.physics.add.collider(this.enemyGroup, this.groundGroup);

    // ── Input ──────────────────────────────────────────────────────────────────
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keyA = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyD = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keyW = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keyS = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.keyF = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.F);
    this.keyShift = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
    this.keyQ = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
    this.keyE = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.keyR = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.R);

    this.input.on("pointerdown", () => this.doAttack());

    // ── Camera ─────────────────────────────────────────────────────────────────
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setZoom(1);

    // ── Attack flash graphics ──────────────────────────────────────────────────
    this.attackFlashGfx = this.add.graphics().setDepth(20);
  }

  private generateTextures() {
    // Sky gradient
    const skyG = this.make.graphics({ x: 0, y: 0, add: false } as any);
    skyG.fillGradientStyle(0x08001a, 0x08001a, 0x1a0040, 0x0d0a2e, 1);
    skyG.fillRect(0, 0, 800, 580);
    // Stars
    for (let i = 0; i < 120; i++) {
      const alpha = 0.4 + Math.random() * 0.6;
      const size = Math.random() > 0.85 ? 2 : 1;
      skyG.fillStyle(0xffffff, alpha);
      skyG.fillRect(Math.random() * 800, Math.random() * 300, size, size);
    }
    // Retro sun
    skyG.fillStyle(0x4400aa, 1);
    skyG.fillCircle(400, 160, 70);
    for (let i = 0; i < 8; i++) {
      const y = 108 + i * 10;
      skyG.fillStyle(0x000000, 1);
      skyG.fillRect(330, y, 140, 5);
    }
    // Horizon glow
    skyG.fillGradientStyle(0xff00cc, 0xff00cc, 0x000000, 0x000000, 0.0);
    skyG.fillRect(0, 240, 800, 60);
    skyG.generateTexture("bg_sky", 800, 580);
    skyG.destroy();

    // Far city silhouette
    const farG = this.make.graphics({ x: 0, y: 0, add: false } as any);
    const buildingData = [
      [0,180,60,100], [60,150,50,130], [110,190,40,90], [150,120,60,160], [210,170,55,110],
      [265,130,45,150], [310,160,70,120], [380,140,50,140], [430,175,60,105],
      [490,155,45,125], [535,125,65,155], [600,165,50,115], [650,185,55,95],
      [705,145,60,135], [765,170,35,110],
    ];
    for (const [bx, by, bw, bh] of buildingData) {
      farG.fillStyle(0x12003a, 1);
      farG.fillRect(bx, 280 - bh, bw - 2, bh);
      // Window lights
      farG.fillStyle(0xcc44ff, 0.5);
      for (let wx = bx + 5; wx < bx + bw - 8; wx += 10) {
        for (let wy = 280 - bh + 8; wy < 275; wy += 14) {
          if (Math.random() > 0.35) {
            farG.fillRect(wx, wy, 5, 7);
          }
        }
      }
    }
    farG.generateTexture("bg_far_city", 800, 280);
    farG.destroy();

    // Mid city silhouette
    const midG = this.make.graphics({ x: 0, y: 0, add: false } as any);
    const midBuildings = [
      [0,120,55,80], [55,90,60,110], [115,130,45,70], [160,100,65,100],
      [225,115,50,85], [275,85,70,115], [345,110,55,90], [400,130,45,70],
      [445,95,60,105], [505,120,50,80], [555,88,65,112], [620,115,55,85],
      [675,105,50,95], [725,90,75,110],
    ];
    for (const [bx, by, bw, bh] of midBuildings) {
      midG.fillStyle(0x1e0050, 1);
      midG.fillRect(bx, 200 - bh, bw - 2, bh);
      midG.lineStyle(1, 0x8800ff, 0.6);
      midG.strokeRect(bx, 200 - bh, bw - 2, bh);
      // Neon windows
      midG.fillStyle(0x00ffff, 0.4);
      for (let wx = bx + 5; wx < bx + bw - 8; wx += 10) {
        for (let wy = 200 - bh + 6; wy < 195; wy += 12) {
          if (Math.random() > 0.3) midG.fillRect(wx, wy, 4, 6);
        }
      }
    }
    midG.generateTexture("bg_mid_city", 800, 200);
    midG.destroy();

    // Player textures per class
    for (const [cls, col] of Object.entries(CLASS_COL)) {
      const pg = this.make.graphics({ x: 0, y: 0, add: false } as any);
      this.drawPlayerSprite(pg, cls as ClassName, col as number);
      pg.generateTexture(`player_${cls}`, 36, 60);
      pg.destroy();
    }

    // Monster textures
    for (const type of (["troll","ghost","guard","spambot","iceling","slime"] as MonsterType[])) {
      const mg = this.make.graphics({ x: 0, y: 0, add: false } as any);
      this.drawMonsterSprite(mg, type);
      mg.generateTexture(`monster_${type}`, MON_W[type] + 4, MON_H[type] + 4);
      mg.destroy();
    }

    // Platform texture
    const platG = this.make.graphics({ x: 0, y: 0, add: false } as any);
    platG.fillStyle(0x4a4a6a, 1);
    platG.fillRect(0, 0, 200, 22);
    platG.lineStyle(2, 0x8888bb, 0.8);
    platG.strokeRect(0, 0, 200, 22);
    platG.generateTexture("platform", 200, 22);
    platG.destroy();
  }

  private drawPlayerSprite(g: Phaser.GameObjects.Graphics, cls: ClassName, col: number) {
    const skin = 0xf5c8a0;
    // Head
    g.fillStyle(skin, 1);
    g.fillEllipse(18, 9, 18, 18);
    // Body
    g.fillStyle(col, 1);
    g.fillRect(10, 17, 16, 22);
    // Legs
    g.fillStyle(col & 0x888888, 1);
    g.fillRect(10, 39, 7, 16);
    g.fillRect(19, 39, 7, 16);
    // Arms
    g.fillStyle(col, 1);
    g.fillRect(3, 18, 8, 16);
    g.fillRect(25, 18, 8, 16);
    // Class weapon / decoration
    if (cls === "Mage") {
      g.fillStyle(0xffaa00, 1);
      g.fillRect(30, 10, 4, 28);
      g.fillStyle(0x00ffff, 1);
      g.fillEllipse(32, 9, 10, 10);
    } else if (cls === "Ranger") {
      g.lineStyle(3, 0x996633, 1);
      g.strokeRect(31, 12, 3, 24);
      g.lineStyle(2, 0xffffff, 0.8);
      g.lineBetween(32, 13, 32, 35);
    } else if (cls === "Tank") {
      g.fillStyle(0xaaaacc, 1);
      g.fillRect(1, 15, 8, 20);
      g.lineStyle(2, 0xffffff, 1);
      g.strokeRect(1, 15, 8, 20);
    } else if (cls === "Assassin") {
      g.fillStyle(0xee00ff, 1);
      g.fillRect(30, 18, 6, 14);
      g.fillRect(28, 16, 6, 14);
    } else if (cls === "Berserker") {
      g.fillStyle(0xff6600, 1);
      g.fillRect(28, 10, 8, 22);
      g.fillRect(26, 14, 12, 6);
    } else if (cls === "Paladin") {
      g.fillStyle(0xffdd00, 1);
      g.fillRect(30, 12, 5, 26);
      g.fillRect(27, 18, 11, 5);
    }
    // Eyes
    g.fillStyle(0x000000, 1);
    g.fillRect(14, 7, 3, 3);
    g.fillRect(21, 7, 3, 3);
    // Neon glow outline
    g.lineStyle(1, col, 0.6);
    g.strokeRect(9, 16, 18, 23);
  }

  private drawMonsterSprite(g: Phaser.GameObjects.Graphics, type: MonsterType) {
    const col = MON_COLOR[type];
    const w = MON_W[type];
    const h = MON_H[type];
    const cx = (w + 4) / 2;
    const cy = (h + 4) / 2;

    if (type === "troll") {
      g.fillStyle(col, 1);
      g.fillRect(cx - 15, cy - 20, 30, 36);
      g.fillStyle(0x880044, 1);
      g.fillRect(cx - 8, cy - 28, 18, 16);
      g.fillStyle(0xcc0066, 1);
      g.fillRect(cx - 18, cy - 10, 8, 14);
      g.fillRect(cx + 10, cy - 10, 8, 14);
      g.fillStyle(0xff0000, 1);
      g.fillRect(cx - 6, cy - 20, 5, 5);
      g.fillRect(cx + 1, cy - 20, 5, 5);
      g.lineStyle(2, 0xff66aa, 0.8);
      g.strokeRect(cx - 15, cy - 28, 30, 56);
    } else if (type === "ghost") {
      g.fillStyle(col, 0.85);
      g.fillEllipse(cx, cy - 8, w, h - 4);
      g.fillStyle(col, 0.65);
      for (let i = 0; i < 3; i++) {
        g.fillEllipse(cx - 12 + i * 12, cy + h / 2 - 8, 12, 14);
      }
      g.fillStyle(0x000000, 1);
      g.fillEllipse(cx - 8, cy - 10, 8, 10);
      g.fillEllipse(cx + 8, cy - 10, 8, 10);
      g.lineStyle(2, col, 1);
      g.strokeEllipse(cx, cy - 8, w, h - 4);
    } else if (type === "guard") {
      g.fillStyle(0x887700, 1);
      g.fillRect(cx - 14, cy - 24, 28, 44);
      g.fillStyle(col, 1);
      g.fillRect(cx - 10, cy - 24, 20, 16);
      g.fillStyle(0x555500, 1);
      g.fillRect(cx - 16, cy - 12, 6, 20);
      g.fillRect(cx + 10, cy - 12, 6, 20);
      g.fillStyle(0xffaa00, 1);
      g.fillRect(cx - 3, cy - 4, 6, 28);
      g.lineStyle(2, col, 0.8);
      g.strokeRect(cx - 14, cy - 24, 28, 44);
    } else if (type === "spambot") {
      g.fillStyle(0x003300, 1);
      g.fillRect(cx - 12, cy - 22, 24, 40);
      g.fillStyle(col, 1);
      g.fillRect(cx - 8, cy - 22, 16, 10);
      g.fillStyle(col, 0.7);
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 4; j++) {
          g.fillRect(cx - 8 + i * 6, cy - 8 + j * 8, 4, 5);
        }
      }
      g.fillStyle(0xff4400, 1);
      g.fillRect(cx - 5, cy - 18, 5, 5);
      g.fillRect(cx + 2, cy - 18, 5, 5);
      g.lineStyle(2, col, 1);
      g.strokeRect(cx - 12, cy - 22, 24, 40);
    } else if (type === "iceling") {
      g.fillStyle(col, 0.9);
      g.fillTriangle(cx, cy - 24, cx - 14, cy + 22, cx + 14, cy + 22);
      g.fillStyle(0xaaddff, 0.7);
      g.fillTriangle(cx, cy - 16, cx - 9, cy + 14, cx + 9, cy + 14);
      g.fillStyle(0xffffff, 1);
      g.fillRect(cx - 2, cy - 20, 4, 4);
      g.lineStyle(2, 0x88ccff, 1);
      g.strokeTriangle(cx, cy - 24, cx - 14, cy + 22, cx + 14, cy + 22);
    } else if (type === "slime") {
      g.fillStyle(col, 0.9);
      g.fillEllipse(cx, cy + 4, w + 4, h - 4);
      g.fillStyle(0x9966ff, 0.7);
      g.fillEllipse(cx, cy + 2, w - 6, h - 12);
      g.fillStyle(0x000000, 1);
      g.fillEllipse(cx - 7, cy - 2, 9, 11);
      g.fillEllipse(cx + 7, cy - 2, 9, 11);
      g.fillStyle(0xffffff, 0.9);
      g.fillEllipse(cx - 5, cy - 4, 4, 5);
      g.fillEllipse(cx + 9, cy - 4, 4, 5);
      g.lineStyle(2, col, 1);
      g.strokeEllipse(cx, cy + 4, w + 4, h - 4);
    }
  }

  private drawGround() {
    const g = this.groundGfx;
    // Main street
    g.fillStyle(0x1a1a2e, 1);
    g.fillRect(0, GROUND_Y, WORLD_W, 120);
    // Road surface
    g.fillStyle(0x22223a, 1);
    g.fillRect(0, GROUND_Y, WORLD_W, 28);
    // Neon grid lines on road
    g.lineStyle(1, 0xff00cc, 0.25);
    for (let x = 0; x < WORLD_W; x += 120) {
      g.lineBetween(x, GROUND_Y, x, GROUND_Y + 28);
    }
    g.lineStyle(1, 0xff00cc, 0.12);
    for (let y = GROUND_Y; y < GROUND_Y + 28; y += 8) {
      g.lineBetween(0, y, WORLD_W, y);
    }
    // Road markings (dashed center line)
    g.lineStyle(3, 0xffdd00, 0.5);
    for (let x = 200; x < WORLD_W; x += 220) {
      g.lineBetween(x, GROUND_Y + 14, x + 100, GROUND_Y + 14);
    }
    // Sidewalk top
    g.fillStyle(0x2a2a44, 1);
    g.fillRect(0, GROUND_Y - 8, WORLD_W, 10);
    g.lineStyle(2, 0x8800ff, 0.4);
    g.lineBetween(0, GROUND_Y - 8, WORLD_W, GROUND_Y - 8);
  }

  private drawCityBuildings() {
    const g = this.add.graphics().setDepth(4);

    // City zone buildings (0-1400)
    const cityBuilds = [
      { x: 200, w: 90, h: 200, col: 0x1a1240, label: "PALACE" },
      { x: 360, w: 70, h: 150, col: 0x12082a, label: "COURT" },
      { x: 480, w: 80, h: 170, col: 0x0a1a2a, label: "BANK" },
      { x: 620, w: 75, h: 160, col: 0x1a120a, label: "ARCADE" },
      { x: 750, w: 85, h: 180, col: 0x1a0a12, label: "POLICE" },
      { x: 900, w: 70, h: 145, col: 0x0a1a10, label: "MUSEUM" },
      { x: 1020, w: 80, h: 155, col: 0x1a1a0a, label: "LIBRARY" },
      { x: 1170, w: 75, h: 165, col: 0x0a0a1a, label: "POST OFFICE" },
    ];

    for (const b of cityBuilds) {
      const by = GROUND_Y - b.h;
      g.fillStyle(b.col, 1);
      g.fillRect(b.x, by, b.w, b.h);
      g.lineStyle(2, 0x6600cc, 0.7);
      g.strokeRect(b.x, by, b.w, b.h);
      // Windows
      for (let wy = by + 12; wy < GROUND_Y - 14; wy += 22) {
        for (let wx = b.x + 8; wx < b.x + b.w - 12; wx += 18) {
          g.fillStyle(Math.random() > 0.3 ? 0x88aaff : 0xffcc44, 0.6);
          g.fillRect(wx, wy, 9, 14);
        }
      }
      // Label
      const txt = this.add.text(b.x + b.w / 2, by - 12, b.label, {
        font: "bold 11px monospace", color: "#cc88ff",
        stroke: "#000000", strokeThickness: 3,
      }).setOrigin(0.5, 1).setDepth(5);
    }

    // Troll Dimension decor (2400-3600)
    for (let tx = 2450; tx < 3600; tx += 220) {
      const th = 80 + Math.floor(Math.sin(tx * 0.01) * 40);
      g.fillStyle(0x1a0026, 1);
      g.fillRect(tx, GROUND_Y - th, 60, th);
      g.lineStyle(2, 0xff00aa, 0.7);
      g.strokeRect(tx, GROUND_Y - th, 60, th);
      g.fillStyle(0xff2d8c, 0.5);
      g.fillEllipse(tx + 30, GROUND_Y - th - 10, 30, 20);
    }
    // Spikes for troll zone
    for (let sx = 2400; sx < 3600; sx += 60) {
      g.fillStyle(0x660033, 0.8);
      g.fillTriangle(sx, GROUND_Y, sx + 30, GROUND_Y - 40, sx + 60, GROUND_Y);
    }

    // Trees for plains (1400-2400)
    for (let tx = 1430; tx < 2380; tx += 110) {
      const th = 60 + (tx % 40);
      g.fillStyle(0x3a2010, 1);
      g.fillRect(tx + 18, GROUND_Y - th, 12, th);
      g.fillStyle(0x1a5a08, 1);
      g.fillEllipse(tx + 24, GROUND_Y - th - 24, 56, 50);
      g.fillStyle(0x2a7a10, 1);
      g.fillEllipse(tx + 24, GROUND_Y - th - 36, 40, 38);
    }

    // Dead trees for exile forest (3600-4800)
    for (let tx = 3620; tx < 4780; tx += 140) {
      g.fillStyle(0x0a1a0a, 1);
      g.fillRect(tx + 20, GROUND_Y - 100, 8, 100);
      g.lineStyle(3, 0x0a2a0a, 1);
      g.lineBetween(tx + 24, GROUND_Y - 80, tx + 24 - 30, GROUND_Y - 50);
      g.lineBetween(tx + 24, GROUND_Y - 70, tx + 24 + 25, GROUND_Y - 42);
      g.lineBetween(tx + 24, GROUND_Y - 90, tx + 24 - 20, GROUND_Y - 70);
    }

    // Ice spires for banned tundra (4800-5800)
    for (let ix = 4820; ix < 5780; ix += 180) {
      const ih = 50 + (ix % 60);
      g.fillStyle(0x88ccff, 0.7);
      g.fillTriangle(ix, GROUND_Y, ix + 20, GROUND_Y - ih, ix + 40, GROUND_Y);
      g.fillStyle(0xaaddff, 0.5);
      g.fillTriangle(ix + 15, GROUND_Y, ix + 28, GROUND_Y - ih * 0.7, ix + 42, GROUND_Y);
    }

    // Swamp vines for spam swamp (5800-6800)
    for (let vx = 5820; vx < 6780; vx += 150) {
      g.lineStyle(4, 0x1a4a08, 0.8);
      g.lineBetween(vx, GROUND_Y - 30, vx + 20, GROUND_Y - 90);
      g.lineBetween(vx + 10, GROUND_Y - 40, vx - 20, GROUND_Y - 85);
      g.fillStyle(0x39ff14, 0.4);
      g.fillEllipse(vx + 10, GROUND_Y - 90, 30, 20);
    }

    // Arena pillars for stream colosseum (6800-8000)
    for (let px = 6850; px < 7980; px += 200) {
      g.fillStyle(0x3a0066, 1);
      g.fillRect(px, GROUND_Y - 140, 30, 140);
      g.fillStyle(0x5500aa, 1);
      g.fillRect(px - 10, GROUND_Y - 145, 50, 16);
      g.lineStyle(2, 0x9900ff, 0.7);
      g.strokeRect(px, GROUND_Y - 140, 30, 140);
    }
  }

  private drawZoneSign(x: number, label: string, color: number) {
    const g = this.add.graphics().setDepth(6);
    const y = GROUND_Y - 80;
    g.fillStyle(0x1a1a2e, 0.95);
    g.fillRect(x, y, 200, 38);
    g.lineStyle(2, color, 1);
    g.strokeRect(x, y, 200, 38);
    // Post
    g.lineStyle(3, 0x554433, 1);
    g.lineBetween(x + 12, y + 38, x + 12, GROUND_Y);
    this.add.text(x + 100, y + 19, label, {
      font: "bold 11px monospace",
      color: "#" + color.toString(16).padStart(6, "0"),
      stroke: "#000000", strokeThickness: 3,
    }).setOrigin(0.5, 0.5).setDepth(7);
  }

  private addPlatform(x: number, y: number, w: number, h: number, color: number) {
    const pg = this.add.graphics().setDepth(5);
    pg.fillStyle(color, 1);
    pg.fillRect(x - w / 2, y, w, h);
    pg.lineStyle(2, 0xaaaaff, 0.6);
    pg.strokeRect(x - w / 2, y, w, h);
    const platSprite = this.groundGroup.create(x, y + h / 2, "__DEFAULT") as Phaser.Physics.Arcade.Sprite;
    platSprite.setVisible(false).refreshBody();
    (platSprite.body as Phaser.Physics.Arcade.StaticBody).setSize(w, h);
  }

  private spawnAllEnemies() {
    for (const spawn of ENEMY_SPAWNS) {
      const sprite = this.physics.add.sprite(
        spawn.x, GROUND_Y - MON_H[spawn.type] - 10, `monster_${spawn.type}`
      ) as Phaser.Physics.Arcade.Sprite;
      sprite.setDepth(9);
      sprite.setCollideWorldBounds(false);

      const hpBar = this.add.graphics().setDepth(11);

      this.enemies.push({
        id: spawn.id,
        type: spawn.type,
        sprite,
        hpBar,
        hp: MON_HP[spawn.type],
        maxHp: MON_HP[spawn.type],
        alive: true,
        spawnX: spawn.x,
        lastAtk: 0,
        lastPatrol: 0,
        patrolDir: Math.random() > 0.5 ? 1 : -1,
        aggro: false,
        dead: false,
        deadTime: 0,
      });
      this.enemyGroup.add(sprite);
    }
  }

  private doAttack(skillIdx?: number) {
    if (this.dead) return;
    const now = Date.now();
    if (skillIdx === undefined) {
      // Basic attack
      if (now - this.lastPlayerAtk < 420) return;
      this.lastPlayerAtk = now;
    } else {
      // Skill attack
      const skill = this.skills[skillIdx];
      if (!skill) return;
      const elapsed = (now - this.skillCooldowns[skillIdx]) / 1000;
      if (elapsed < skill.cooldown) return;
      if (this.playerMp < 10) return;
      this.skillCooldowns[skillIdx] = now;
      this.playerMp = Math.max(0, this.playerMp - 10);
      this.onMpChange(this.playerMp);
      this.onSkillFire(skillIdx);
    }

    // Calculate damage
    const baseDmg = this.playerAtk;
    const mult = skillIdx !== undefined ? this.skills[skillIdx].dmgMult : 1;
    const isCrit = Math.random() < 0.2;
    const dmg = Math.round(baseDmg * mult * (isCrit ? 2 : 1) * (0.85 + Math.random() * 0.3));

    // Range
    const range = skillIdx !== undefined ? 200 : ATTACK_RANGE;
    const px = this.player.x;
    const py = this.player.y;

    // Hit enemies in range
    for (const en of this.enemies) {
      if (!en.alive) continue;
      const dist = Math.abs(en.sprite.x - px);
      const distY = Math.abs(en.sprite.y - py);
      if (dist <= range && distY < 80) {
        en.hp = Math.max(0, en.hp - dmg);
        // screen-relative position for damage number
        const camX = this.cameras.main.scrollX;
        const camY = this.cameras.main.scrollY;
        const sX = en.sprite.x - camX;
        const sY = en.sprite.y - camY - 40;
        this.onDmgNumber(sX, sY, dmg, isCrit);

        if (en.hp <= 0) this.killEnemy(en);
      }
    }

    // Visual attack flash
    this.showAttackEffect(px, py, range, skillIdx);
  }

  private showAttackEffect(px: number, py: number, range: number, skillIdx?: number) {
    const col = skillIdx !== undefined ? parseInt(this.skills[skillIdx].color.replace("#", ""), 16) : 0xffffff;
    const g = this.add.graphics().setDepth(15);
    const dir = this.facingRight ? 1 : -1;
    g.fillStyle(col, 0.5);
    g.fillRect(
      this.facingRight ? px : px - range,
      py - 20,
      range,
      40
    );
    g.lineStyle(3, col, 0.9);
    g.strokeRect(
      this.facingRight ? px : px - range,
      py - 20,
      range,
      40
    );
    this.time.delayedCall(180, () => g.destroy());
  }

  private killEnemy(en: EnemyData) {
    en.alive = false;
    en.dead = true;
    en.deadTime = Date.now();
    en.sprite.setAlpha(0.3);
    en.hpBar.clear();
    this.kills++;
    this.playerXp += MON_XP[en.type];
    this.onKillsChange(this.kills);
    this.onXpChange(this.playerXp);
    this.onChat(`🗡 You slayed a ${en.type}! +${MON_XP[en.type]} XP`);
    this.time.delayedCall(800, () => {
      en.sprite.setVisible(false);
    });
  }

  update(time: number, delta: number) {
    if (this.dead) return;
    const dt = delta / 1000;
    const now = Date.now();

    // ── Player movement ─────────────────────────────────────────────────────────
    const onGround = (this.player.body as Phaser.Physics.Arcade.Body).blocked.down;
    const sprint = this.keyShift.isDown;
    const speed = PLAYER_SPEED * (sprint ? SPRINT_MULT : 1);

    const left  = this.cursors.left.isDown  || this.keyA.isDown;
    const right = this.cursors.right.isDown || this.keyD.isDown;
    const jump  = (this.cursors.up.isDown || this.keyW.isDown || this.cursors.space.isDown);

    if (left) {
      this.player.setVelocityX(-speed);
      this.facingRight = false;
      this.player.setFlipX(true);
    } else if (right) {
      this.player.setVelocityX(speed);
      this.facingRight = true;
      this.player.setFlipX(false);
    } else {
      this.player.setVelocityX(0);
    }

    if (jump && onGround) {
      this.player.setVelocityY(JUMP_VEL);
    }

    // ── Skills ──────────────────────────────────────────────────────────────────
    if (Phaser.Input.Keyboard.JustDown(this.keyQ)) this.doAttack(0);
    if (Phaser.Input.Keyboard.JustDown(this.keyE)) this.doAttack(1);
    if (Phaser.Input.Keyboard.JustDown(this.keyR)) this.doAttack(2);
    if (Phaser.Input.Keyboard.JustDown(this.keyF)) this.doAttack();

    // ── MP regen ────────────────────────────────────────────────────────────────
    this.mpRegenTimer += dt;
    if (this.mpRegenTimer >= 1.2) {
      this.mpRegenTimer = 0;
      this.playerMp = Math.min(this.playerMaxMp, this.playerMp + 3);
      this.onMpChange(this.playerMp);
    }

    // ── Zone detection ──────────────────────────────────────────────────────────
    const px = this.player.x;
    let zoneIdx = 0;
    for (let i = 0; i < ZONES.length; i++) {
      if (px >= ZONES[i].xStart && px < ZONES[i].xEnd) { zoneIdx = i; break; }
    }
    if (zoneIdx !== this.currentZoneIdx) {
      this.currentZoneIdx = zoneIdx;
      this.onZoneChange(ZONES[zoneIdx]);
    }

    // ── Enemy AI ────────────────────────────────────────────────────────────────
    for (const en of this.enemies) {
      if (!en.alive) {
        // Respawn check
        if (en.dead && now - en.deadTime > RESPAWN_MS) {
          en.hp = en.maxHp;
          en.alive = true;
          en.dead = false;
          en.aggro = false;
          en.sprite.setPosition(en.spawnX, GROUND_Y - MON_H[en.type] - 10);
          en.sprite.setAlpha(1).setVisible(true);
        }
        continue;
      }

      const dist = Math.abs(en.sprite.x - this.player.x);
      const aggroRange = MON_AGGRO[en.type];
      const atkRange = MON_ATK_RANGE[en.type];

      if (dist < aggroRange) {
        en.aggro = true;
      } else if (dist > aggroRange * 1.8) {
        en.aggro = false;
      }

      if (en.aggro) {
        const dir = this.player.x > en.sprite.x ? 1 : -1;
        en.sprite.setVelocityX(MON_SPEED[en.type] * dir);
        en.sprite.setFlipX(dir < 0);

        // Attack player
        if (dist < atkRange && now - en.lastAtk > 1600) {
          en.lastAtk = now;
          if (now - this.lastPlayerHit > 500) {
            this.lastPlayerHit = now;
            this.onPlayerHit(MON_DMG[en.type]);
          }
        }
      } else {
        // Patrol
        if (now - en.lastPatrol > 2200) {
          en.lastPatrol = now;
          en.patrolDir = -en.patrolDir;
        }
        const patrolSpd = MON_SPEED[en.type] * 0.35;
        const newX = en.sprite.x + en.patrolDir * patrolSpd * dt;
        if (Math.abs(newX - en.spawnX) > 160) en.patrolDir = -en.patrolDir;
        en.sprite.setVelocityX(en.patrolDir * patrolSpd);
        en.sprite.setFlipX(en.patrolDir < 0);
      }

      // Draw HP bar
      en.hpBar.clear();
      if (en.alive) {
        const bw = MON_W[en.type] + 8;
        const bx = en.sprite.x - bw / 2;
        const by = en.sprite.y - MON_H[en.type] / 2 - 14;
        en.hpBar.fillStyle(0x330000, 1);
        en.hpBar.fillRect(bx, by, bw, 6);
        const hpPct = en.hp / en.maxHp;
        const hpColor = hpPct > 0.5 ? 0x39ff14 : hpPct > 0.25 ? 0xffaa00 : 0xff2200;
        en.hpBar.fillStyle(hpColor, 1);
        en.hpBar.fillRect(bx, by, bw * hpPct, 6);
      }
    }

    // ── Parallax ────────────────────────────────────────────────────────────────
    const camX = this.cameras.main.scrollX;
    this.bgFarCity.tilePositionX = camX * 0.12;
    this.bgMidCity.tilePositionX = camX * 0.28;
  }
}

// ─── REACT HUD ────────────────────────────────────────────────────────────────

function HUD({
  username, color, origin, hp, maxHp, mp, maxMp, xp, kills,
  skills, skillCooldowns, zone, chatMessages, onChat, onLeave, onlineCount, dead,
}: {
  username: string; color: string; origin: string;
  hp: number; maxHp: number; mp: number; maxMp: number;
  xp: number; kills: number;
  skills: SkillDef[]; skillCooldowns: React.MutableRefObject<number[]>;
  zone: typeof ZONES[0] | null;
  chatMessages: ChatMsg[];
  onChat: (text: string) => void;
  onLeave: () => void;
  onlineCount: number;
  dead: boolean;
}) {
  const [chatInput, setChatInput] = useState("");
  const [showChat, setShowChat] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const [, forceRender] = useState(0);

  useEffect(() => {
    const id = setInterval(() => forceRender(n => n + 1), 100);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [chatMessages]);

  const sendChat = () => {
    const t = chatInput.trim();
    if (!t) return;
    onChat(t);
    setChatInput("");
  };

  const hpPct = hp / maxHp;
  const mpPct = mp / maxMp;
  const level = Math.floor(xp / 100) + 1;
  const xpPct = xp % 100;

  const getSkillCd = (idx: number) => {
    const now = Date.now();
    const elapsed = (now - skillCooldowns.current[idx]) / 1000;
    return Math.max(0, (skills[idx]?.cooldown ?? 0) - elapsed);
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-20 select-none">
      {/* Death screen */}
      <AnimatePresence>
        {dead && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center bg-red-900/60 z-50"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <div className="text-center">
              <p className="text-red-300 font-black text-4xl uppercase tracking-widest" style={{ textShadow: "0 0 30px #ff0000" }}>
                ☠ YOU DIED
              </p>
              <p className="text-white/60 font-mono text-sm mt-2">Respawning in 4 seconds…</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Player stats — top left */}
      <div className="absolute top-3 left-3 pointer-events-auto min-w-[190px]">
        <div className="bg-black/85 border border-white/15 px-3 py-2.5 space-y-2"
          style={{ boxShadow: `0 0 18px ${color}33` }}>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }} />
            <span className="text-white font-mono text-xs uppercase font-bold truncate">{username}</span>
            <span className="ml-auto text-yellow-400 font-mono text-[10px]">🏆 {kills}</span>
          </div>
          <div className="font-mono text-[9px] uppercase tracking-widest" style={{ color }}>{origin}</div>
          <div className="space-y-0.5">
            <div className="flex justify-between">
              <span className="text-red-400 font-mono text-[9px] uppercase">HP</span>
              <span className="text-red-300 font-mono text-[9px]">{hp}/{maxHp}</span>
            </div>
            <div className="bg-black/60 h-2.5 w-full">
              <div className="h-full transition-all duration-150"
                style={{ width: `${hpPct * 100}%`, background: hpPct > 0.5 ? "#39ff14" : hpPct > 0.25 ? "#ffa000" : "#ff2200" }} />
            </div>
          </div>
          <div className="space-y-0.5">
            <div className="flex justify-between">
              <span className="text-blue-400 font-mono text-[9px] uppercase">MP</span>
              <span className="text-blue-300 font-mono text-[9px]">{mp}/{maxMp}</span>
            </div>
            <div className="bg-black/60 h-2 w-full">
              <div className="h-full bg-blue-500 transition-all duration-150" style={{ width: `${mpPct * 100}%` }} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-yellow-400 font-mono text-[9px] uppercase">XP</span>
            <div className="flex-1 bg-black/50 h-1.5">
              <div className="h-full bg-yellow-400" style={{ width: `${xpPct}%` }} />
            </div>
            <span className="text-yellow-300 font-mono text-[9px]">Lv.{level}</span>
          </div>
        </div>
        {zone && (
          <div className="bg-black/70 border border-white/10 px-3 py-1.5 mt-1">
            <div className="font-mono text-[11px] uppercase tracking-wider" style={{ color: zone.color }}>
              📍 {zone.name}
            </div>
            <div className="font-mono text-[9px] text-white/40 uppercase">{zone.danger}</div>
          </div>
        )}
      </div>

      {/* Top right — online count + leave */}
      <div className="absolute top-3 right-3 flex gap-2 pointer-events-auto">
        <div className="bg-black/70 border border-white/10 px-3 py-2 flex items-center gap-2">
          <Users className="w-3 h-3 text-pink-400" />
          <span className="text-pink-300 font-mono text-xs">{onlineCount} online</span>
        </div>
        <button onClick={onLeave}
          className="bg-black/70 border border-red-500/40 px-3 py-2 text-red-400 hover:bg-red-900/30 transition flex items-center gap-1 pointer-events-auto">
          <LogOut className="w-3 h-3" />
        </button>
      </div>

      {/* Bottom — skills bar */}
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex gap-2 items-end">
        <div className="flex flex-col items-center gap-0.5">
          <div className="w-12 h-12 bg-black/70 border-2 border-white/30 flex items-center justify-center text-white text-sm font-mono">⚔</div>
          <span className="text-white/40 font-mono text-[9px] uppercase">F/Click</span>
        </div>
        {skills.map((sk, i) => {
          const cd = getSkillCd(i);
          const onCd = cd > 0;
          return (
            <div key={i} className="flex flex-col items-center gap-0.5">
              <div className="relative w-14 h-14">
                <div className={`w-full h-full border-2 flex flex-col items-center justify-center transition-all ${onCd ? "opacity-50" : "opacity-100"}`}
                  style={{ background: onCd ? "#111" : `${sk.color}22`, borderColor: sk.color, boxShadow: onCd ? "none" : `0 0 12px ${sk.color}55` }}>
                  <span className="font-mono text-[10px] font-bold text-white/80 uppercase">{sk.key}</span>
                  <span className="font-mono text-[8px] text-white/50 uppercase text-center px-0.5 leading-tight">{sk.label}</span>
                </div>
                {onCd && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                    <span className="font-mono text-white font-bold text-sm">{cd.toFixed(1)}</span>
                  </div>
                )}
              </div>
              <span className="text-white/30 font-mono text-[8px]">{sk.cooldown}s</span>
            </div>
          );
        })}
      </div>

      {/* Controls hint */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
        <div className="bg-black/50 px-3 py-1 border border-white/10">
          <p className="text-white/30 font-mono text-[9px] uppercase tracking-widest">
            A/D or ←/→ Move · W/Space Jump · Shift Sprint · F/Click Attack · Q/E/R Skills
          </p>
        </div>
      </div>

      {/* Chat — bottom left */}
      <div className="absolute bottom-3 left-3 w-72 space-y-1.5 pointer-events-auto">
        <div ref={chatRef} className="bg-black/65 border border-white/10 p-2 h-24 overflow-y-auto space-y-0.5">
          {chatMessages.map(m => (
            <div key={m.id} className="font-mono text-[10px] leading-tight">
              <span style={{ color: "#ff2d8c" }}>{m.username}: </span>
              <span className="text-white/80">{m.text}</span>
            </div>
          ))}
          {chatMessages.length === 0 && (
            <p className="text-white/20 font-mono text-[10px] uppercase">Bahamas Land awaits…</p>
          )}
        </div>
        {showChat ? (
          <div className="flex gap-1.5">
            <input
              autoFocus value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") { sendChat(); setShowChat(false); }
                if (e.key === "Escape") setShowChat(false);
              }}
              maxLength={100} placeholder="Chat…"
              className="flex-1 bg-black border border-primary text-primary font-mono text-xs px-2 py-1 focus:outline-none placeholder:text-white/20 uppercase"
            />
            <button onClick={() => { sendChat(); setShowChat(false); }}
              className="bg-primary text-black font-bold text-xs px-2 py-1 uppercase">
              Send
            </button>
          </div>
        ) : (
          <button onClick={() => setShowChat(true)}
            className="text-white/30 font-mono text-[10px] uppercase hover:text-primary transition">
            [T] Chat
          </button>
        )}
      </div>
    </div>
  );
}

// ─── DAMAGE NUMBERS ───────────────────────────────────────────────────────────

function DamageNumbers({ nums }: { nums: DmgNumber[] }) {
  return (
    <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
      {nums.map(n => (
        <div key={n.id}
          className="absolute font-black font-mono select-none"
          style={{
            left: n.x, top: n.y,
            color: n.crit ? "#ffd600" : "#ff4444",
            textShadow: n.crit ? "0 0 12px #ffd600" : "0 0 8px #ff0000",
            animation: "dmgFloat 1.2s ease-out forwards",
            fontSize: n.crit ? "22px" : "16px",
          }}>
          {n.crit ? `⚡${n.val}` : `-${n.val}`}
        </div>
      ))}
      <style>{`@keyframes dmgFloat{0%{opacity:1;transform:translateY(0) scale(1.2);}60%{opacity:1;transform:translateY(-40px) scale(1);}100%{opacity:0;transform:translateY(-70px) scale(0.8);}}`}</style>
    </div>
  );
}

// ─── SKILL FLASH ──────────────────────────────────────────────────────────────

function SkillFlash({ color, label }: { color: string; label: string }) {
  return (
    <motion.div
      className="absolute inset-0 pointer-events-none z-25 flex items-center justify-center"
      initial={{ opacity: 0 }} animate={{ opacity: [0, 0.35, 0] }} transition={{ duration: 0.5 }}>
      <div className="text-4xl font-black font-mono uppercase tracking-widest"
        style={{ color, textShadow: `0 0 30px ${color},0 0 60px ${color}` }}>
        {label}
      </div>
    </motion.div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function OGWorld() {
  const [, setLocation] = useLocation();
  const gameRef = useRef<Phaser.Game | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const myId       = sessionStorage.getItem("og_world_id")       || "anon";
  const myUsername = sessionStorage.getItem("og_world_username") || "Citizen";
  const myColor    = sessionStorage.getItem("og_world_color")    || "#ff2d8c";
  const myOrigin   = (sessionStorage.getItem("og_world_origin")  || "Tank") as ClassName;
  const skills     = CLASS_SKILLS[myOrigin] ?? CLASS_SKILLS.Tank;
  const maxHp      = CLASS_HP[myOrigin] ?? 200;

  const [hp, setHp] = useState(maxHp);
  const [mp, setMp] = useState(100);
  const [xp, setXp] = useState(0);
  const [kills, setKills] = useState(0);
  const [dead, setDead] = useState(false);
  const [zone, setZone] = useState<typeof ZONES[0]>(ZONES[0]);
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([
    { username: "Nattoun", text: `Welcome to OG World 2D, ${myUsername}! Fight your way through!`, id: 1 },
    { username: "System",  text: "A/D Move · W/Space Jump · F Attack · Q/E/R Skills", id: 2 },
  ]);
  const [dmgNums, setDmgNums] = useState<DmgNumber[]>([]);
  const [skillFlash, setSkillFlash] = useState<{ color: string; label: string } | null>(null);
  const [onlineCount, setOnlineCount] = useState(1);
  const dmgIdRef = useRef(0);
  const skillCDsRef = useRef([0, 0, 0]);
  const channelRef = useRef<any>(null);

  // Stable callbacks for Phaser to call back into React
  const onHpChange = useCallback((newHp: number) => setHp(newHp), []);
  const onMpChange = useCallback((newMp: number) => setMp(newMp), []);
  const onXpChange = useCallback((newXp: number) => setXp(newXp), []);
  const onKillsChange = useCallback((k: number) => setKills(k), []);
  const onDmgNumber = useCallback((x: number, y: number, val: number, crit: boolean) => {
    const id = ++dmgIdRef.current;
    setDmgNums(prev => [...prev.slice(-18), { id, x, y, val, crit, born: Date.now() }]);
  }, []);
  const onPlayerHit = useCallback((dmg: number) => {
    setHp(prev => {
      const newHp = Math.max(0, prev - dmg);
      if (newHp <= 0) {
        setDead(true);
        setTimeout(() => {
          setHp(maxHp);
          setMp(100);
          setDead(false);
          setChatMessages(p => [...p.slice(-50), {
            username: "Nattoun", text: "You died. Embarrassing. Even for a citizen.", id: Date.now(),
          }]);
        }, 4000);
      }
      return newHp;
    });
    // Red screen flash
    const id = ++dmgIdRef.current;
    setDmgNums(prev => [...prev.slice(-18), {
      id, x: window.innerWidth / 2 + (Math.random() - 0.5) * 80,
      y: window.innerHeight / 2 - 40, val: dmg, crit: false, born: Date.now(),
    }]);
  }, [maxHp]);
  const onZoneChange = useCallback((z: typeof ZONES[0]) => setZone(z), []);
  const onSkillFire = useCallback((idx: number) => {
    skillCDsRef.current[idx] = Date.now();
    const sk = skills[idx];
    if (sk) {
      setSkillFlash({ color: sk.color, label: sk.label });
      setTimeout(() => setSkillFlash(null), 500);
    }
  }, [skills]);
  const onChat = useCallback((text: string) => {
    setChatMessages(prev => [...prev.slice(-50), { username: "System", text, id: Date.now() }]);
  }, []);

  // Damage number cleanup
  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      setDmgNums(prev => prev.filter(n => now - n.born < 1200));
    }, 300);
    return () => clearInterval(id);
  }, []);

  // Supabase multiplayer presence
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    const ch = supabase.channel("og-world-2d-v1", { config: { presence: { key: myId } } });
    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState();
      setOnlineCount(Object.keys(state).length);
    })
    .on("broadcast", { event: "chat" }, ({ payload }: any) => {
      setChatMessages(prev => [...prev.slice(-50), {
        username: payload.username, text: payload.text, id: Date.now(),
      }]);
    })
    .subscribe(async (status: string) => {
      if (status === "SUBSCRIBED") {
        await ch.track({ id: myId, username: myUsername, class: myOrigin });
      }
    });
    channelRef.current = ch;
    return () => { supabase!.removeChannel(ch); };
  }, []);

  const handleChat = useCallback((text: string) => {
    channelRef.current?.send({ type: "broadcast", event: "chat", payload: { username: myUsername, text } });
    setChatMessages(prev => [...prev.slice(-50), { username: myUsername, text, id: Date.now() }]);
  }, [myUsername]);

  // T key for chat
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "KeyT") e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Boot Phaser
  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    const W = window.innerWidth;
    const H = window.innerHeight;

    // Store init data at module level so the scene can read it in init()
    _sceneInitData = {
      onHpChange, onMpChange, onXpChange, onKillsChange,
      onDmgNumber, onPlayerHit, onZoneChange, onSkillFire, onChat,
      hp: maxHp, maxHp, playerClass: myOrigin,
    };

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: W,
      height: H,
      backgroundColor: "#08001a",
      parent: containerRef.current,
      physics: {
        default: "arcade",
        arcade: { gravity: { x: 0, y: GRAVITY_VAL }, debug: false },
      },
      scene: OGWorldScene,
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
    };

    const game = new Phaser.Game(config);
    gameRef.current = game;

    return () => {
      game.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black">
      {/* Phaser canvas container */}
      <div ref={containerRef} className="absolute inset-0" />

      {/* React HUD overlay */}
      <HUD
        username={myUsername} color={myColor} origin={myOrigin}
        hp={hp} maxHp={maxHp} mp={mp} maxMp={100}
        xp={xp} kills={kills}
        skills={skills} skillCooldowns={skillCDsRef}
        zone={zone} chatMessages={chatMessages}
        onChat={handleChat} onLeave={() => setLocation("/og-gate")}
        onlineCount={onlineCount} dead={dead}
      />

      {/* Damage numbers */}
      <DamageNumbers nums={dmgNums} />

      {/* Skill flash */}
      <AnimatePresence>
        {skillFlash && <SkillFlash key={skillFlash.label} color={skillFlash.color} label={skillFlash.label} />}
      </AnimatePresence>
    </div>
  );
}
