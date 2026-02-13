import { useEffect, useMemo, useState } from "react";
import { actionGame, addFriend, getGameState, hasAuth, login, logout, sendCode, setNickname, syncGame } from "./api";

const CARS = [
  { id: "wuling-hongguang", name: "五菱宏光", price: 28000, incomePerHour: 80, levelReq: 1, tier: "入门", brand: "五菱", brandBonus: 0.94, maintenanceFactor: 0.72 },
  { id: "byd-f3", name: "比亚迪F3", price: 42000, incomePerHour: 120, levelReq: 1, tier: "入门", brand: "比亚迪", brandBonus: 0.97, maintenanceFactor: 0.78 },
  { id: "chevy-cruze", name: "雪佛兰科鲁兹", price: 68000, incomePerHour: 195, levelReq: 1, tier: "入门", brand: "雪佛兰", brandBonus: 1, maintenanceFactor: 0.9 },
  { id: "vw-lavida", name: "大众朗逸", price: 98000, incomePerHour: 300, levelReq: 2, tier: "家用", brand: "大众", brandBonus: 1.02, maintenanceFactor: 0.95 },
  { id: "honda-civic", name: "本田思域", price: 145000, incomePerHour: 450, levelReq: 3, tier: "家用", brand: "本田", brandBonus: 1.05, maintenanceFactor: 0.92 },
  { id: "toyota-camry", name: "丰田凯美瑞", price: 188000, incomePerHour: 590, levelReq: 4, tier: "家用", brand: "丰田", brandBonus: 1.06, maintenanceFactor: 0.9 },
  { id: "tesla-model-3", name: "特斯拉Model 3", price: 265000, incomePerHour: 860, levelReq: 5, tier: "进阶", brand: "特斯拉", brandBonus: 1.12, maintenanceFactor: 1.08 },
  { id: "audi-a4", name: "奥迪A4", price: 320000, incomePerHour: 1080, levelReq: 6, tier: "进阶", brand: "奥迪", brandBonus: 1.1, maintenanceFactor: 1.18 },
  { id: "bmw-3", name: "宝马3系", price: 385000, incomePerHour: 1300, levelReq: 7, tier: "进阶", brand: "宝马", brandBonus: 1.12, maintenanceFactor: 1.22 },
  { id: "benz-c", name: "奔驰C级", price: 452000, incomePerHour: 1540, levelReq: 8, tier: "进阶", brand: "奔驰", brandBonus: 1.11, maintenanceFactor: 1.25 },
  { id: "bmw-5", name: "宝马5系", price: 570000, incomePerHour: 1920, levelReq: 9, tier: "豪华", brand: "宝马", brandBonus: 1.13, maintenanceFactor: 1.28 },
  { id: "benz-e", name: "奔驰E级", price: 688000, incomePerHour: 2340, levelReq: 10, tier: "豪华", brand: "奔驰", brandBonus: 1.14, maintenanceFactor: 1.3 },
  { id: "audi-a6l", name: "奥迪A6L", price: 820000, incomePerHour: 2820, levelReq: 11, tier: "豪华", brand: "奥迪", brandBonus: 1.15, maintenanceFactor: 1.31 },
  { id: "tesla-model-s", name: "特斯拉Model S", price: 980000, incomePerHour: 3420, levelReq: 12, tier: "豪华", brand: "特斯拉", brandBonus: 1.17, maintenanceFactor: 1.38 },
  { id: "porsche-718", name: "保时捷718", price: 1230000, incomePerHour: 4380, levelReq: 13, tier: "性能", brand: "保时捷", brandBonus: 1.2, maintenanceFactor: 1.52 },
  { id: "porsche-911", name: "保时捷911", price: 1480000, incomePerHour: 5280, levelReq: 14, tier: "性能", brand: "保时捷", brandBonus: 1.22, maintenanceFactor: 1.6 },
  { id: "maserati-ghibli", name: "玛莎拉蒂Ghibli", price: 1860000, incomePerHour: 6740, levelReq: 15, tier: "性能", brand: "玛莎拉蒂", brandBonus: 1.24, maintenanceFactor: 1.7 },
  { id: "lamborghini-huracan", name: "兰博基尼Huracan", price: 2680000, incomePerHour: 9800, levelReq: 17, tier: "超跑", brand: "兰博基尼", brandBonus: 1.28, maintenanceFactor: 1.95 },
  { id: "ferrari-f8", name: "法拉利F8", price: 3450000, incomePerHour: 12800, levelReq: 19, tier: "超跑", brand: "法拉利", brandBonus: 1.31, maintenanceFactor: 2.08 },
  { id: "bugatti-chiron", name: "布加迪Chiron", price: 5200000, incomePerHour: 19800, levelReq: 22, tier: "神车", brand: "布加迪", brandBonus: 1.36, maintenanceFactor: 2.35 },
];

const CAR_IMAGE_MODULES = import.meta.glob("../assets/cars/*.{png,jpg,jpeg,webp,avif,svg}", { eager: true, import: "default" });
const CAR_IMAGE_BY_NAME = Object.fromEntries(
  Object.entries(CAR_IMAGE_MODULES)
    .map(([path, src]) => {
      const match = path.match(/\/([^/]+)\.[^.]+$/);
      return match ? [match[1], src] : null;
    })
    .filter(Boolean)
);

function formatMoney(n) {
  return `¥${Math.floor(Number(n || 0)).toLocaleString("zh-CN")}`;
}

function getCarModel(modelId) {
  return CARS.find((c) => c.id === modelId);
}

function getCarImageByModelId(modelId) {
  const model = getCarModel(modelId);
  return model ? CAR_IMAGE_BY_NAME[model.name] || null : null;
}

function getCarByUid(cars, carUid) {
  return (cars || []).find((c) => c.uid === carUid);
}

function carIncomePerMinute(car) {
  const model = getCarModel(car.modelId);
  if (!model) return 0;
  const depreciationFactor = Math.max(0.35, car.condition / 100);
  return (model.incomePerHour / 60) * (model.brandBonus || 1) * depreciationFactor;
}

function getRepairCost(car) {
  const model = getCarModel(car.modelId);
  const need = Math.max(0, 100 - car.condition);
  if (!model || need <= 0) return 0;
  return need * 420 * (model.maintenanceFactor || 1);
}

function computeResale(car) {
  const base = car.buyPrice;
  const conditionFactor = Math.max(0.3, car.condition / 100);
  const mileagePenalty = Math.min(0.35, car.mileage / 18000);
  return base * conditionFactor * (1 - mileagePenalty);
}

function emptyState() {
  return {
    cash: 0,
    level: 1,
    exp: 0,
    slots: 0,
    cars: [],
    parkedOwn: [],
    friendLots: {},
    interaction: { totalTicket: 0, totalReport: 0, byFriend: {} },
    tasks: [],
    totalEarned: 0,
    tempBuff: null,
    activeEventText: "",
    log: [],
  };
}

export default function App() {
  const [state, setState] = useState(emptyState());
  const [me, setMe] = useState({ userId: 0, nickname: "" });
  const [friends, setFriends] = useState([]);
  const [friendLots, setFriendLots] = useState({});
  const [globalRanking, setGlobalRanking] = useState([]);
  const [authed, setAuthed] = useState(hasAuth());
  const [booting, setBooting] = useState(true);
  const [activeTab, setActiveTab] = useState("parking");
  const [marketFilters, setMarketFilters] = useState({ level: "all", roi: "all", price: "all" });

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [friendEmail, setFriendEmail] = useState("");
  const [authMsg, setAuthMsg] = useState("");
  const [actionMsg, setActionMsg] = useState("");
  const [sendingCode, setSendingCode] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [addingFriend, setAddingFriend] = useState(false);
  const [savingNickname, setSavingNickname] = useState(false);
  const [nicknameInput, setNicknameInput] = useState("");
  const [showRules, setShowRules] = useState(false);

  function applyBundle(data) {
    const incomingNickname = data?.me?.nickname || "";
    const currentNickname = me.nickname || "";
    setState(data?.state || emptyState());
    setMe(data?.me || { userId: 0, nickname: "" });
    setNicknameInput((prev) => (prev === currentNickname || !prev ? incomingNickname : prev));
    setFriends(Array.isArray(data?.friends) ? data.friends : []);
    setFriendLots(data?.friendLots || {});
    setGlobalRanking(Array.isArray(data?.globalRanking) ? data.globalRanking : []);
  }

  async function loadState() {
    const data = await getGameState();
    applyBundle(data);
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (authed) {
        try {
          const data = await getGameState();
          if (mounted) applyBundle(data);
        } catch (err) {
          if (mounted) {
            setAuthed(false);
            setAuthMsg(err.message || "登录已失效，请重新登录");
          }
        }
      }
      if (mounted) setBooting(false);
    })();
    return () => {
      mounted = false;
    };
  }, [authed]);

  useEffect(() => {
    if (!authed) return undefined;
    const timer = setInterval(async () => {
      try {
        const data = await syncGame();
        applyBundle(data);
      } catch {
        setAuthed(false);
        setAuthMsg("会话失效，请重新登录");
      }
    }, 4000);
    return () => clearInterval(timer);
  }, [authed]);

  const parkedFriendSlots = useMemo(() => {
    const map = {};
    for (const friend of friends) {
      const key = String(friend.userId);
      map[key] = (friendLots?.[key] || []).filter((s) => s.type === "player");
    }
    return map;
  }, [friendLots, friends]);

  const busyIds = useMemo(() => {
    const inFriend = Object.values(parkedFriendSlots).flat().map((slot) => slot.carUid);
    return new Set([...(state.parkedOwn || []), ...inFriend]);
  }, [parkedFriendSlots, state.parkedOwn]);

  const freeCars = useMemo(() => (state.cars || []).filter((car) => !busyIds.has(car.uid)), [state.cars, busyIds]);

  const canUpgradeSlots = state.level >= state.slots;
  const slotUpgradeCost = state.slots * 90000;

  const friendRanking = useMemo(() => {
    return [...friends]
      .map((friend) => {
        const key = String(friend.userId);
        const data = state.interaction?.byFriend?.[key] || { ticket: 0, report: 0, park: 0 };
        return { ...friend, ...data, score: data.ticket * 2 + data.report * 3 + data.park };
      })
      .sort((a, b) => b.score - a.score);
  }, [friends, state.interaction]);

  const marketCars = useMemo(() => {
    return CARS.filter((car) => {
      if (marketFilters.level === "canBuyNow") {
        if (state.level < (car.levelReq || 1) || state.cash < car.price) return false;
      } else if (marketFilters.level === "levelUnlocked") {
        if (state.level < (car.levelReq || 1)) return false;
      } else if (marketFilters.level === "locked") {
        if (state.level >= (car.levelReq || 1)) return false;
      }

      const paybackHours = car.price / (car.incomePerHour * (car.brandBonus || 1));
      if (marketFilters.roi === "high" && paybackHours > 280) return false;
      if (marketFilters.roi === "mid" && (paybackHours <= 280 || paybackHours > 420)) return false;
      if (marketFilters.roi === "low" && paybackHours <= 420) return false;

      if (marketFilters.price === "lt100k" && car.price >= 100000) return false;
      if (marketFilters.price === "100k-500k" && (car.price < 100000 || car.price > 500000)) return false;
      if (marketFilters.price === "500k-1500k" && (car.price < 500000 || car.price > 1500000)) return false;
      if (marketFilters.price === "gt1500k" && car.price <= 1500000) return false;
      return true;
    }).sort((a, b) => a.price - b.price);
  }, [marketFilters, state.cash, state.level]);

  async function runAction(action, payload = {}) {
    setActionMsg("");
    try {
      const data = await actionGame(action, payload);
      applyBundle(data);
    } catch (err) {
      setActionMsg(err.message || "操作失败");
    }
  }

  async function handleSendCode() {
    setSendingCode(true);
    setAuthMsg("");
    try {
      await sendCode(email.trim());
      setAuthMsg("验证码已发送，请查收邮箱");
    } catch (err) {
      setAuthMsg(err.message || "发送失败");
    } finally {
      setSendingCode(false);
    }
  }

  async function handleLogin() {
    setLoggingIn(true);
    setAuthMsg("");
    try {
      await login(email.trim(), code.trim());
      setAuthed(true);
      await loadState();
      setCode("");
    } catch (err) {
      setAuthMsg(err.message || "登录失败");
    } finally {
      setLoggingIn(false);
    }
  }

  async function handleAddFriend() {
    setAddingFriend(true);
    setActionMsg("");
    try {
      await addFriend(friendEmail.trim());
      setFriendEmail("");
      const data = await getGameState();
      applyBundle(data);
    } catch (err) {
      setActionMsg(err.message || "添加好友失败");
    } finally {
      setAddingFriend(false);
    }
  }

  async function handleLogout() {
    await logout();
    setAuthed(false);
    setState(emptyState());
    setMe({ userId: 0, nickname: "" });
    setFriends([]);
    setFriendLots({});
    setGlobalRanking([]);
  }

  async function handleSetNickname() {
    setSavingNickname(true);
    setActionMsg("");
    try {
      const data = await setNickname(nicknameInput.trim());
      applyBundle(data);
    } catch (err) {
      setActionMsg(err.message || "昵称保存失败");
    } finally {
      setSavingNickname(false);
    }
  }

  if (booting) {
    return <div className="app"><section className="panel"><h2>正在加载...</h2></section></div>;
  }

  if (!authed) {
    return (
      <div className="app">
        <section className="panel">
          <h2>账号登录</h2>
          <div className="task-list">
            <div className="task-item">
              <div style={{ width: "100%" }}>
                <strong>邮箱验证码登录</strong>
                <div style={{ marginTop: 10 }}>
                  <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="请输入邮箱" style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #d7bc8e", marginBottom: 8 }} />
                  <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="请输入验证码" style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #d7bc8e" }} />
                </div>
                {authMsg && <div className="hint" style={{ marginTop: 8 }}>{authMsg}</div>}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={handleSendCode} disabled={sendingCode || !email.trim()}>{sendingCode ? "发送中" : "发送验证码"}</button>
                <button onClick={handleLogin} disabled={loggingIn || !email.trim() || !code.trim()}>{loggingIn ? "登录中" : "登录"}</button>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <h1>抢车位</h1>
        <div className="stats">
          <span>昵称：{me.nickname || "-"}</span>
          <span>现金：{formatMoney(state.cash)}</span>
          <span>等级：Lv.{state.level}</span>
          <span>经验：{Math.floor(state.exp)}</span>
          <span>累计收入：{formatMoney(state.totalEarned)}</span>
          <input
            value={nicknameInput}
            onChange={(e) => setNicknameInput(e.target.value)}
            placeholder="修改昵称"
            style={{ padding: "6px 10px", borderRadius: 999, border: "1px solid #e3cca1", minWidth: 130 }}
          />
          <button onClick={handleSetNickname} disabled={savingNickname || !nicknameInput.trim() || nicknameInput.trim() === (me.nickname || "")}>
            {savingNickname ? "保存中" : "保存昵称"}
          </button>
          <button onClick={() => setShowRules(true)}>游戏规则</button>
          <button onClick={handleLogout}>退出登录</button>
        </div>
      </header>

      <section className="event-bar">
        <div>{state.activeEventText}</div>
        <div>{state.tempBuff ? `当前加成：${state.tempBuff.label}` : "当前加成：无"}</div>
      </section>

      {actionMsg && (
        <section className="panel" style={{ borderColor: "#c65a00" }}>
          <div className="illegal">{actionMsg}</div>
        </section>
      )}

      <nav className="tabs">
        <button className={activeTab === "parking" ? "active" : ""} onClick={() => setActiveTab("parking")}>停车场</button>
        <button className={activeTab === "friends" ? "active" : ""} onClick={() => setActiveTab("friends")}>好友抢位</button>
        <button className={activeTab === "ranking" ? "active" : ""} onClick={() => setActiveTab("ranking")}>全服排行</button>
        <button className={activeTab === "market" ? "active" : ""} onClick={() => setActiveTab("market")}>车市</button>
        <button className={activeTab === "garage" ? "active" : ""} onClick={() => setActiveTab("garage")}>车库折旧</button>
        <button className={activeTab === "tasks" ? "active" : ""} onClick={() => setActiveTab("tasks")}>任务系统</button>
      </nav>

      {activeTab === "parking" && (
        <section className="panel">
          <h2>我的停车场（{state.parkedOwn.length}/{state.slots}）</h2>
          <div className="slot-grid">
            {Array.from({ length: state.slots }).map((_, i) => {
              const parkedUid = state.parkedOwn[i];
              const car = parkedUid ? getCarByUid(state.cars, parkedUid) : null;
              const model = car ? getCarModel(car.modelId) : null;
              const imageSrc = model ? getCarImageByModelId(model.id) : null;
              return (
                <div key={i} className="slot">
                  {car ? (
                    <>
                      {imageSrc && <img className="car-thumb" src={imageSrc} alt={model?.name} />}
                      <div className="car-name">{model?.name}</div>
                      <div className="income">{formatMoney(carIncomePerMinute(car))}/分钟</div>
                      <div className="hint">车况 {car.condition.toFixed(1)}%</div>
                      <button onClick={() => runAction("pullOut", { carUid: car.uid })}>驶离</button>
                    </>
                  ) : (
                    <>
                      <div className="empty">空位</div>
                      {freeCars[0] ? (
                        <button onClick={() => runAction("parkOwn", { carUid: freeCars[0].uid })}>停入 {getCarModel(freeCars[0].modelId)?.name}</button>
                      ) : (
                        <span className="hint">无可用车辆</span>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
          <div className="upgrade">
            <button onClick={() => runAction("upgradeSlots")}>扩建车位（{formatMoney(slotUpgradeCost)}）</button>
            {!canUpgradeSlots && <span className="hint">需要等级达到 {state.slots}</span>}
          </div>
        </section>
      )}

      {activeTab === "friends" && (
        <section className="panel">
          <h2>好友停车场 / 邮箱加好友</h2>

          <div className="task-item" style={{ marginBottom: 12 }}>
            <div style={{ width: "100%" }}>
              <strong>添加好友</strong>
              <div className="hint">输入对方注册邮箱，添加成功后可抢占对方车位</div>
              <input
                value={friendEmail}
                onChange={(e) => setFriendEmail(e.target.value)}
                placeholder="好友邮箱"
                style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #d7bc8e", marginTop: 8 }}
              />
            </div>
            <button onClick={handleAddFriend} disabled={addingFriend || !friendEmail.trim()}>{addingFriend ? "添加中" : "添加"}</button>
          </div>

          <div className="ranking-card">
            <h3>好友互动排行榜</h3>
            <table>
              <thead><tr><th>好友</th><th>邮箱</th><th>抢位</th><th>互动分</th></tr></thead>
              <tbody>{friendRanking.map((r) => <tr key={r.userId}><td>{r.nickname}</td><td>{r.email}</td><td>{r.park || 0}</td><td>{r.score || 0}</td></tr>)}</tbody>
            </table>
          </div>

          {friends.map((friend) => {
            const key = String(friend.userId);
            const slots = friendLots?.[key] || [];
            const emptySlotCount = slots.filter((s) => s.type === "empty").length;
            return (
              <div key={friend.userId} className="friend-card">
                <div>
                  <strong>{friend.nickname}</strong>
                  <span>车位 {friend.slots - emptySlotCount}/{friend.slots}</span>
                </div>
                <div className="friend-slots">
                  {slots.map((slot) => {
                    if (slot.type === "empty") return <div key={slot.slotId} className="friend-slot friend-empty">空位</div>;
                    if (slot.type === "player") {
                      const car = getCarByUid(state.cars, slot.carUid);
                      const model = car ? getCarModel(car.modelId) : null;
                      const imageSrc = model ? getCarImageByModelId(model.id) : null;
                      return (
                        <div key={slot.slotId} className="friend-slot friend-player">
                          {imageSrc && <img className="car-thumb" src={imageSrc} alt={model?.name} />}
                          <div>我的 {model?.name || "车辆"}</div>
                          <button onClick={() => runAction("pullOut", { carUid: slot.carUid })}>取回</button>
                        </div>
                      );
                    }
                    return (
                      <div key={slot.slotId} className="friend-slot friend-npc">
                        <div>{slot.ownerNickname || "好友"} 的车辆</div>
                        <div className="hint">该车位已被占用</div>
                      </div>
                    );
                  })}
                </div>
                {emptySlotCount > 0 && freeCars.length > 0 && (
                  <button onClick={() => runAction("parkFriend", { carUid: freeCars[0].uid, friendUserId: friend.userId })}>
                    抢位停入 {getCarModel(freeCars[0].modelId)?.name}
                  </button>
                )}
                {emptySlotCount === 0 && <span className="hint">暂无空位</span>}
              </div>
            );
          })}

          {friends.length === 0 && <div className="hint">你还没有好友，先通过邮箱添加好友。</div>}
        </section>
      )}

      {activeTab === "ranking" && (
        <section className="panel">
          <h2>全服排行榜</h2>
          <div className="ranking-card">
            <table>
              <thead><tr><th>排名</th><th>玩家</th><th>等级</th><th>累计收入</th><th>现金</th><th>综合分</th></tr></thead>
              <tbody>
                {globalRanking.map((item, idx) => (
                  <tr key={item.userId}>
                    <td>{idx + 1}</td>
                    <td>{item.nickname}</td>
                    <td>Lv.{item.level}</td>
                    <td>{formatMoney(item.totalEarned)}</td>
                    <td>{formatMoney(item.cash)}</td>
                    <td>{item.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeTab === "market" && (
        <section className="panel">
          <h2>车市</h2>
          <div className="market-filters">
            <label>等级筛选<select value={marketFilters.level} onChange={(e) => setMarketFilters((p) => ({ ...p, level: e.target.value }))}><option value="all">全部车型</option><option value="canBuyNow">当前可直接购买</option><option value="levelUnlocked">等级已解锁</option><option value="locked">等级未解锁</option></select></label>
            <label>收益率筛选<select value={marketFilters.roi} onChange={(e) => setMarketFilters((p) => ({ ...p, roi: e.target.value }))}><option value="all">全部收益率</option><option value="high">高收益率（回本快）</option><option value="mid">中收益率（均衡）</option><option value="low">低收益率（回本慢）</option></select></label>
            <label>价格区间<select value={marketFilters.price} onChange={(e) => setMarketFilters((p) => ({ ...p, price: e.target.value }))}><option value="all">全部价格</option><option value="lt100k">10万以下</option><option value="100k-500k">10万 - 50万</option><option value="500k-1500k">50万 - 150万</option><option value="gt1500k">150万以上</option></select></label>
            <button type="button" onClick={() => setMarketFilters({ level: "all", roi: "all", price: "all" })}>重置筛选</button>
          </div>
          <div className="market-list">
            {marketCars.map((car) => (
              <div key={car.id} className="market-item">
                <div>
                  {getCarImageByModelId(car.id) && <img className="car-thumb" src={getCarImageByModelId(car.id)} alt={car.name} />}
                  <strong>{car.name}</strong>
                  <div>品牌：{car.brand}</div><div>定位：{car.tier}</div><div>解锁：Lv.{car.levelReq || 1}</div>
                  <div>品牌收益加成：x{(car.brandBonus || 1).toFixed(2)}</div><div>维护系数：x{(car.maintenanceFactor || 1).toFixed(2)}</div>
                  <div>{formatMoney(car.price)}</div><div>{formatMoney(car.incomePerHour)}/小时（满车况）</div>
                </div>
                <button disabled={state.cash < car.price || state.level < (car.levelReq || 1)} onClick={() => runAction("buyCar", { modelId: car.id })}>{state.level < (car.levelReq || 1) ? "等级不足" : state.cash < car.price ? "现金不足" : "购买"}</button>
              </div>
            ))}
            {marketCars.length === 0 && <div className="hint">没有符合当前筛选条件的车型</div>}
          </div>
        </section>
      )}

      {activeTab === "garage" && (
        <section className="panel">
          <h2>车库折旧（{state.cars.length}）</h2>
          <div className="garage-list">
            {state.cars.map((car) => {
              const model = getCarModel(car.modelId);
              const imageSrc = model ? getCarImageByModelId(model.id) : null;
              const upkeepCost = getRepairCost(car);
              return (
                <div key={car.uid} className="garage-item garage-rich">
                  <div>
                    {imageSrc && <img className="car-thumb" src={imageSrc} alt={model?.name} />}
                    <strong>{model?.name}</strong><div>品牌：{model?.brand}</div>
                    <div>车况：{car.condition.toFixed(1)}%</div><div>里程：{car.mileage.toFixed(1)} km</div>
                    <div>当前收益：{formatMoney(carIncomePerMinute(car) * 60)}/小时</div><div>维护系数：x{(model?.maintenanceFactor || 1).toFixed(2)}</div>
                    <div>估值：{formatMoney(computeResale(car))}</div>
                  </div>
                  <button disabled={upkeepCost <= 0 || state.cash < upkeepCost} onClick={() => runAction("repairCar", { carUid: car.uid })}>保养 {formatMoney(upkeepCost)}</button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {activeTab === "tasks" && (
        <section className="panel">
          <h2>任务系统（每日刷新）</h2>
          <div className="task-list">
            {state.tasks.map((task) => {
              const done = task.progress >= task.target;
              return (
                <div key={task.id} className="task-item">
                  <div><strong>{task.title}</strong><div>进度：{Math.floor(task.progress)}/{task.target}</div><div>奖励：{formatMoney(task.rewardCash)} + {task.rewardExp} EXP</div></div>
                  <button disabled={!done || task.claimed} onClick={() => runAction("claimTask", { taskId: task.id })}>{task.claimed ? "已领取" : done ? "领取" : "未完成"}</button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <aside className="log-panel">
        <div className="log-head"><h3>系统消息</h3><button onClick={() => runAction("resetGame")}>重开存档</button></div>
        <ul>{(state.log || []).map((line, i) => <li key={i}>{line}</li>)}</ul>
      </aside>

      {showRules && (
        <div className="rules-mask" onClick={() => setShowRules(false)}>
          <section className="rules-modal" onClick={(e) => e.stopPropagation()}>
            <div className="rules-head">
              <h3>抢车位游戏规则</h3>
              <button onClick={() => setShowRules(false)}>关闭</button>
            </div>
            <div className="rules-content">
              <p>1. 购买车辆并停入自己的车位可持续产出金币，车况越高收益越高。</p>
              <p>2. 车辆可以抢停到好友车位，好友车位收益更高，但也会更快折旧。</p>
              <p>3. 车辆会随时间产生里程和折旧，车况下降后需要在车库进行保养。</p>
              <p>4. 完成每日任务可获得现金和经验，经验提升会增加可解锁车型与玩法。</p>
              <p>5. 随机事件会带来临时收益加成或损耗，建议关注系统消息。</p>
              <p>6. 好友互动排行统计你与好友的抢位行为，全服排行按综合资产评分。</p>
              <p>7. 所有核心数据均保存在服务器，登录同一账号可跨设备同步。</p>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
