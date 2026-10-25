// 파이썬 settings.py 를 옮긴 것
// 화면
const [WIDTH, HEIGHT] = [960, 540];
const FPS = 60;
const TITLE = "Slime Jump";

// 타일
const TILE = 40;

// 색
const SKY = [135, 206, 235];
const GROUND = [120, 80, 40];
const GROUND_TOP = [80, 170, 60];
const SLIME = [60, 200, 80];
const SLIME_DARK = [30, 140, 50];
const SLIME_LIGHT = [160, 240, 170];
const ENEMY = [150, 60, 180];
const ENEMY_DARK = [90, 30, 110];
const FIRE_OUT = [240, 90, 20];
const FIRE_IN = [255, 220, 60];
const SPIKE = [170, 170, 180];
const SPIKE_DARK = [90, 90, 100];
const COIN = [255, 210, 40];
const COIN_DARK = [200, 150, 20];
const FLAG_POLE = [200, 200, 210];
const FLAG = [230, 50, 50];
const HEART = [235, 50, 80];
const HEART_DARK = [150, 20, 40];
const BERRY = [230, 30, 50];
const BERRY_SEED = [255, 230, 120];
const LEAF = [40, 150, 50];
const STAR_GLOW = [255, 240, 120];
const BOSS = [200, 50, 30];
const BOSS_DARK = [110, 20, 10];
const BOSS_BELLY = [250, 190, 110];
const CROWN = [255, 200, 40];
const GOLD = [255, 205, 40];
const GOLD_DARK = [170, 110, 10];
const GOLD_SEED = [255, 250, 210];
const GATE = [90, 90, 100];
const ZAP = [255, 220, 40];
const ZAP_DARK = [150, 110, 0];
const SPARK = [190, 235, 255];
const SPARK_CORE = [255, 255, 255];
const BIRD = [110, 100, 210];
const BIRD_DARK = [60, 50, 130];
const BIRD_BELLY = [230, 225, 255];
const BEAK = [255, 160, 40];
const HOP = [250, 140, 70];
const HOP_DARK = [170, 70, 30];
const HOP_BELLY = [255, 220, 170];
const FEATHER = [235, 235, 250];
const DRAGON = [120, 40, 90];
const DRAGON_DARK = [60, 15, 45];
const DRAGON_BELLY = [240, 170, 120];
const DRAGON_WING = [90, 20, 60];
const WYRM = [165, 25, 40];
const WYRM_DARK = [70, 10, 20];
const WYRM_BELLY = [255, 210, 140];
// ??? 보스: 검은 거대 슬라임 (테두리를 밝게 해서 배경과 구분, 눈은 빨갛게)
const BIG_SLIME = [25, 25, 32];
const BIG_SLIME_EDGE = [110, 105, 130];
const BIG_SLIME_LIGHT = [80, 80, 100];
const BIG_SLIME_EYE = [255, 50, 50];
const GOO = [35, 30, 45];
const GOO_EDGE = [150, 130, 180];
const WHITE = [255, 255, 255];
const BLACK = [20, 20, 20];
const SHADOW = [0, 0, 0, 150];

// 플레이어 물리 (픽셀/프레임 기준)
const MOVE_SPEED = 5;
const ACCEL = 0.6;
const FRICTION = 0.7;
const GRAVITY = 0.6;
const JUMP_SPEED = -16; // 약 5타일 높이
const JUMP_CUT = -6; // 점프키를 일찍 떼면 이 속도로 줄여 낮게 점프
const MAX_FALL = 16;
const STOMP_BOUNCE = -9; // 적을 밟았을 때 튀어오르는 속도

// 롱점프 (↑ 화살표): 위로 높이 (약 7.5타일)
const LONG_JUMP_VY = -19;

// 몬스터에 닿았을 때 넉백: 8px x 20프레임 = 4타일
const KNOCKBACK_SPEED = 8;
const KNOCKBACK_FRAMES = 21; // 마지막 프레임에 정지하므로 이동은 20프레임
const KNOCKBACK_VY = -6;
const HIT_INVINCIBLE = 1.5; // 맞은 뒤 무적 시간 (초)
const STAR_TIME = 30.0; // 딸기를 먹으면 불사 상태 (초)

// 보스 (불꽃 대왕)
const BOSS_HP = 5; // 밟아야 하는 횟수
const BOSS_HIT_INVINCIBLE = 1.2;
const BOSS_STOMP_BOUNCE = -13;
const BOSS_WALK_SPEED = 1.5;
const BOSS_CHARGE_SPEED = 9;
const BOSS_FIREBALL_SPEED = 5;
const BOSS_SHOCKWAVE_SPEED = 6;

// 번개 대왕 (2스테이지 보스)
const BOLT_WARN = 0.9; // 번개가 떨어질 자리 예고 (초)
const BOLT_STRIKE = 0.35; // 번개가 내리치고 있는 시간 (초)
const ORB_SPEED = 3.5; // 튀어다니는 전기 구슬 속도
const FLOOR_WARN = 1.1; // 바닥 전기 예고 (초)
const FLOOR_TIME = 1.6; // 바닥에 전기가 흐르는 시간 (초) → 끝나면 보스가 지쳐서 멈춤

// 폭풍 독수리 (3스테이지 보스)
const EAGLE_DIVE_SPEED = 10; // 급강하 속도
const EAGLE_FEATHER_SPEED = 6;
const EAGLE_SWEEP_SPEED = 9; // 낮게 휩쓸기 속도

// 마왕 드래곤 (4스테이지 보스): 날면서 불덩이 + 번개 + 전기 구슬 + 급강하
const DRAGON_FIRE_SPEED = 6;
const DRAGON_HP = 15; // 4스테이지 보스 체력

// ??? (5스테이지 보스): 거대 슬라임. 연속 점프 / 슬라임 뱉기 / 내려찍기 / 돌진
const GIANT_HP = 20;
const GIANT_DASH_SPEED = 10;
const GOO_WAVE_SPEED = 6;

// 적
const ENEMY_SPEED = 1.5;

// 불뿜는 괴물
const BREATHER = [210, 70, 40];
const BREATHER_DARK = [130, 30, 20];
const BREATHER_BELLY = [250, 200, 120];
const FIRE_INTERVAL = 2.5; // 불 뿜는 간격 (초)
const FIRE_WARN = 0.6; // 뿜기 전 입이 달아오르는 시간 (초)
const FIRE_RANGE = 12; // 플레이어가 이 타일 거리 안에 있을 때만 뿜음
const FIREBALL_SPEED = 4.5;
const FIREBALL_LIFE = 3.0; // 초

// 전기 괴물 (2스테이지): 순찰 → 멈춰서 충전 → 전기 방출 (방출 중엔 밟으면 감전)
const ZAP_IDLE = 2.5; // 순찰 시간 (초)
const ZAP_CHARGE = 0.8; // 충전 예고 (초)
const ZAP_DISCHARGE = 1.0; // 방출 시간 (초)
const ZAP_RADIUS = 22; // 방출 범위: 몸 둘레로 이만큼 넓어짐 (px)

// 새 괴물 (3스테이지): 공중 순찰 → 플레이어가 가까우면 번쩍인 뒤 직선 돌진
const BIRD_RANGE = 7; // 이 타일 거리 안에 들어오면 돌진 준비
const BIRD_AIM = 0.6; // 돌진 예고 (초)
const BIRD_DASH_SPEED = 7;
const BIRD_DASH_TIME = 1.0;
const BIRD_COOLDOWN = 2.0;

// 뛰는 괴물 (3스테이지): 플레이어 쪽으로 깡충깡충
const HOP_WAIT = 1.2; // 뛰기 전 대기 (초)
const HOP_VY = -11;
const HOP_VX = 3;
const HOP_RANGE = 10;

// 작은 용 (5스테이지): 공중을 날며 플레이어를 겨냥해 불덩이 (불덩이는 넉백만)
const WYRM_INTERVAL = 2.6; // 불 쏘는 간격 (초)
const WYRM_WARN = 0.5; // 쏘기 전 입이 달아오르는 시간 (초)
const WYRM_RANGE = 9; // 이 타일 거리 안이면 쏨
const WYRM_FIRE_SPEED = 4.5;

// 게임
const LIVES = 3;
