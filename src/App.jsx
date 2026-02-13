import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "qq-qiangchewei-save-v2";
const MINUTE_MS = 60_000;
const EVENT_INTERVAL_MS = 75_000;

const CARS = [
  { id: "byd-f3", name: "比亚迪F3", price: 42000, incomePerHour: 120 },
  { id: "vw-lavida", name: "大众朗逸", price: 98000, incomePerHour: 320 },
  { id: "audi-a4", name: "奥迪A4", price: 320000, incomePerHour: 1100 },
  { id: "bmw-5", name: "宝马5系", price: 470000, incomePerHour: 1600 },
  { id: "porsche-911", name: "保时捷911", price: 1480000, incomePerHour: 5200 },
];

const FRIENDS = [
  { id: "f1", name: "小Q", slots: 3 },
  { id: "f2", name: "阿黄", slots: 4 },
  { id: "f3", name: "晴天", slots: 5 },
  { id: "f4", name: "七喜", slots: 4 },
];

const NPC_CAR_NAMES = ["面包车", "出租车", "皮卡", "商务车", "小跑车"];
const NPC_NAMES = ["路人甲", "隔壁老王", "阿杰", "阿勇", "小陈", "老赵"];

function formatMoney(n) {
  return `¥${Math.floor(n).toLocaleString("zh-CN")}`;
}

function uid(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getCarModel(modelId) {
  return CARS.find((c) => c.id === modelId);
}

function createOwnedCar(modelId) {
  const model = getCarModel(modelId);
  return {
    uid: uid("car"),
    modelId,
    buyPrice: model?.price || 0,
    condition: 100,
    mileage: 0,
  };
}

function createNpcSpotSlot(illegalChance = 0.35) {
  return {
    type: "npc",
    slotId: uid("slot"),
    owner: NPC_NAMES[Math.floor(Math.random() * NPC_NAMES.length)],
    carLabel: NPC_CAR_NAMES[Math.floor(Math.random() * NPC_CAR_NAMES.length)],
    illegal: Math.random() < illegalChance,
    ticketed: false,
  };
}

function createEmptySlot() {
  return {
    type: "empty",
    slotId: uid("slot"),
  };
}

function createInitialFriendLots() {
  const lots = {};
  FRIENDS.forEach((friend) => {
    lots[friend.id] = Array.from({ length: friend.slots }).map(() => {
      if (Math.random() < 0.52) {
        return createNpcSpotSlot();
      }
      return createEmptySlot();
    });
  });
  return lots;
}

function createTasks() {
  return [
    {
      id: "t-buy-2",
      title: "购入 2 辆车",
      key: "buyCar",
      target: 2,
      progress: 0,
      rewardCash: 12000,
      rewardExp: 16,
      claimed: false,
    },
    {
      id: "t-ticket-3",
      title: "完成贴条/举报 3 次",
      key: "enforce",
      target: 3,
      progress: 0,
      rewardCash: 15000,
      rewardExp: 20,
      claimed: false,
    },
    {
      id: "t-friend-2",
      title: "抢占好友车位 2 次",
      key: "friendPark",
      target: 2,
      progress: 0,
      rewardCash: 10000,
      rewardExp: 12,
      claimed: false,
    },
    {
      id: "t-earn-30000",
      title: "累计经营收入 30000",
      key: "earnCash",
      target: 30000,
      progress: 0,
      rewardCash: 22000,
      rewardExp: 35,
      claimed: false,
    },
  ];
}

function defaultState() {
  const starter = createOwnedCar(CARS[0].id);
  return {
    cash: 120000,
    level: 1,
    exp: 0,
    slots: 2,
    cars: [starter],
    parkedOwn: [starter.uid],
    friendLots: createInitialFriendLots(),
    interaction: {
      totalTicket: 0,
      totalReport: 0,
      byFriend: FRIENDS.reduce((acc, cur) => {
        acc[cur.id] = { ticket: 0, report: 0, park: 0 };
        return acc;
      }, {}),
    },
    tasks: createTasks(),
    totalEarned: 0,
    tempBuff: null,
    activeEventText: "城市治安系统已上线，注意违停车辆。",
    lastTickAt: Date.now(),
    lastEventAt: Date.now(),
    lastTaskResetAt: Date.now(),
    log: ["欢迎来到QQ抢车位 Web复刻版"],
  };
}

function appendLog(log, text) {
  return [text, ...log].slice(0, 20);
}

function carIncomePerMinute(car, multiplier = 1) {
  const model = getCarModel(car.modelId);
  if (!model) return 0;
  const depreciationFactor = Math.max(0.35, car.condition / 100);
  return (model.incomePerHour / 60) * depreciationFactor * multiplier;
}

function getCarByUid(cars, carUid) {
  return cars.find((c) => c.uid === carUid);
}

function computeResale(car) {
  const base = car.buyPrice;
  const conditionFactor = Math.max(0.3, car.condition / 100);
  const mileagePenalty = Math.min(0.35, car.mileage / 18000);
  return base * conditionFactor * (1 - mileagePenalty);
}

function progressTasks(tasks, key, value = 1) {
  return tasks.map((task) => {
    if (task.key !== key || task.claimed) return task;
    return {
      ...task,
      progress: Math.min(task.target, task.progress + value),
    };
  });
}

function maybeSpawnNpc(friendLots) {
  const next = { ...friendLots };
  for (const friend of FRIENDS) {
    if (Math.random() > 0.25) continue;
    const slots = [...next[friend.id]];
    const emptyIndex = slots.findIndex((s) => s.type === "empty");
    if (emptyIndex === -1) continue;
    slots[emptyIndex] = createNpcSpotSlot(0.42);
    next[friend.id] = slots;
  }
  return next;
}

function maybeTriggerRandomEvent(prev, cars) {
  const rand = Math.random();
  if (rand < 0.2) {
    const bonus = 6000 + Math.floor(Math.random() * 4000);
    return {
      ...prev,
      cash: prev.cash + bonus,
      exp: prev.exp + 6,
      activeEventText: `随机事件：城建补贴到账 ${formatMoney(bonus)}`,
      log: appendLog(prev.log, `随机事件：你收到市政补贴 ${formatMoney(bonus)}`),
    };
  }

  if (rand < 0.45) {
    const activeCars = cars.filter((c) => c.condition < 100);
    if (activeCars.length > 0) {
      const chosen = activeCars[Math.floor(Math.random() * activeCars.length)];
      const nextCars = cars.map((c) =>
        c.uid === chosen.uid ? { ...c, condition: Math.min(100, c.condition + 10) } : c
      );
      return {
        ...prev,
        cars: nextCars,
        activeEventText: "随机事件：车辆保养日，部分车辆状态恢复",
        log: appendLog(prev.log, `随机事件：${getCarModel(chosen.modelId)?.name} 状态 +10`),
      };
    }
  }

  if (rand < 0.7) {
    return {
      ...prev,
      tempBuff: {
        multiplier: 1.18,
        expiresAt: Date.now() + 6 * MINUTE_MS,
        label: "商圈高峰（收益+18%）",
      },
      activeEventText: "随机事件：商圈高峰，短时收益提升",
      log: appendLog(prev.log, "随机事件：商圈高峰触发，6分钟内收益+18%"),
    };
  }

  const eligible = cars.filter((c) => c.condition > 45);
  if (eligible.length > 0) {
    const chosen = eligible[Math.floor(Math.random() * eligible.length)];
    const nextCars = cars.map((c) =>
      c.uid === chosen.uid ? { ...c, condition: c.condition - 8 } : c
    );
    return {
      ...prev,
      cars: nextCars,
      activeEventText: "随机事件：剐蹭事故，车辆状态下降",
      log: appendLog(prev.log, `随机事件：${getCarModel(chosen.modelId)?.name} 发生剐蹭，状态 -8`),
    };
  }

  return prev;
}

export default function App() {
  const [state, setState] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return defaultState();
    try {
      const base = defaultState();
      const parsed = JSON.parse(saved);
      const merged = { ...base, ...parsed };
      if (!Array.isArray(merged.cars)) merged.cars = base.cars;
      if (!Array.isArray(merged.parkedOwn)) merged.parkedOwn = base.parkedOwn;
      if (!merged.friendLots || typeof merged.friendLots !== "object") {
        merged.friendLots = base.friendLots;
      }
      if (!Array.isArray(merged.tasks)) merged.tasks = base.tasks;
      if (!merged.interaction || typeof merged.interaction !== "object") {
        merged.interaction = base.interaction;
      }
      return merged;
    } catch {
      return defaultState();
    }
  });

  const [activeTab, setActiveTab] = useState("parking");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    const timer = setInterval(() => {
      setState((prev) => {
        const now = Date.now();
        const deltaMin = (now - prev.lastTickAt) / MINUTE_MS;
        if (deltaMin <= 0) return prev;

        const buffMultiplier = prev.tempBuff && prev.tempBuff.expiresAt > now ? prev.tempBuff.multiplier : 1;

        let earned = 0;
        const friendParkedUids = Object.values(prev.friendLots)
          .flat()
          .filter((slot) => slot.type === "player")
          .map((slot) => slot.carUid);

        const nextCars = prev.cars.map((car) => {
          const inOwn = prev.parkedOwn.includes(car.uid);
          const inFriend = friendParkedUids.includes(car.uid);
          if (!inOwn && !inFriend) return car;

          const lotMultiplier = inFriend ? 1.25 : 1;
          const income = carIncomePerMinute(car, lotMultiplier * buffMultiplier) * deltaMin;
          earned += income;

          const wearRate = inFriend ? 0.065 : 0.05;
          return {
            ...car,
            condition: Math.max(30, car.condition - wearRate * deltaMin),
            mileage: car.mileage + 0.85 * deltaMin,
          };
        });

        let next = {
          ...prev,
          cars: nextCars,
          cash: prev.cash + earned,
          totalEarned: prev.totalEarned + earned,
          exp: prev.exp + earned / 450,
          level: Math.max(prev.level, Math.floor((prev.exp + earned / 450) / 100) + 1),
          tempBuff: prev.tempBuff && prev.tempBuff.expiresAt > now ? prev.tempBuff : null,
          friendLots: maybeSpawnNpc(prev.friendLots),
          tasks: progressTasks(prev.tasks, "earnCash", earned),
          lastTickAt: now,
        };

        if (now - prev.lastTaskResetAt >= 24 * 60 * MINUTE_MS) {
          next.tasks = createTasks();
          next.lastTaskResetAt = now;
          next.log = appendLog(next.log, "每日任务已刷新");
        }

        if (now - prev.lastEventAt >= EVENT_INTERVAL_MS && Math.random() < 0.42) {
          next = maybeTriggerRandomEvent(next, next.cars);
          next.lastEventAt = now;
        } else if (now - prev.lastEventAt >= EVENT_INTERVAL_MS) {
          next.lastEventAt = now;
        }

        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const parkedFriendSlots = useMemo(() => {
    const map = {};
    for (const friend of FRIENDS) {
      map[friend.id] = state.friendLots[friend.id]?.filter((s) => s.type === "player") || [];
    }
    return map;
  }, [state.friendLots]);

  const busyIds = useMemo(() => {
    const inFriend = Object.values(parkedFriendSlots)
      .flat()
      .map((slot) => slot.carUid);
    return new Set([...state.parkedOwn, ...inFriend]);
  }, [parkedFriendSlots, state.parkedOwn]);

  const freeCars = useMemo(() => state.cars.filter((car) => !busyIds.has(car.uid)), [state.cars, busyIds]);

  const canUpgradeSlots = state.level >= state.slots;
  const slotUpgradeCost = state.slots * 90000;

  const ranking = useMemo(() => {
    return [...FRIENDS]
      .map((friend) => {
        const data = state.interaction.byFriend[friend.id] || { ticket: 0, report: 0, park: 0 };
        const score = data.ticket * 2 + data.report * 3 + data.park;
        return { ...friend, ...data, score };
      })
      .sort((a, b) => b.score - a.score);
  }, [state.interaction.byFriend]);

  function buyCar(modelId) {
    const model = getCarModel(modelId);
    if (!model) return;
    setState((prev) => {
      if (prev.cash < model.price) return prev;
      const newCar = createOwnedCar(modelId);
      return {
        ...prev,
        cash: prev.cash - model.price,
        cars: [...prev.cars, newCar],
        tasks: progressTasks(prev.tasks, "buyCar", 1),
        log: appendLog(prev.log, `买入 ${model.name}`),
      };
    });
  }

  function parkInOwnSlot(carUid) {
    setState((prev) => {
      if (prev.parkedOwn.length >= prev.slots) return prev;
      if (!prev.cars.some((c) => c.uid === carUid)) return prev;
      if (prev.parkedOwn.includes(carUid)) return prev;
      const inFriend = Object.values(prev.friendLots)
        .flat()
        .some((s) => s.type === "player" && s.carUid === carUid);
      if (inFriend) return prev;

      const car = getCarByUid(prev.cars, carUid);
      return {
        ...prev,
        parkedOwn: [...prev.parkedOwn, carUid],
        log: appendLog(prev.log, `${getCarModel(car?.modelId)?.name || "车辆"} 停入自己的车位`),
      };
    });
  }

  function parkAtFriend(carUid, friendId) {
    setState((prev) => {
      const slots = prev.friendLots[friendId] || [];
      const emptyIndex = slots.findIndex((s) => s.type === "empty");
      if (emptyIndex === -1) return prev;
      if (!prev.cars.some((c) => c.uid === carUid)) return prev;
      if (prev.parkedOwn.includes(carUid)) return prev;
      const already = Object.values(prev.friendLots)
        .flat()
        .some((s) => s.type === "player" && s.carUid === carUid);
      if (already) return prev;

      const nextSlots = [...slots];
      nextSlots[emptyIndex] = {
        type: "player",
        slotId: slots[emptyIndex].slotId,
        carUid,
      };

      const friend = FRIENDS.find((f) => f.id === friendId);
      const car = getCarByUid(prev.cars, carUid);
      return {
        ...prev,
        friendLots: { ...prev.friendLots, [friendId]: nextSlots },
        interaction: {
          ...prev.interaction,
          byFriend: {
            ...prev.interaction.byFriend,
            [friendId]: {
              ...prev.interaction.byFriend[friendId],
              park: prev.interaction.byFriend[friendId].park + 1,
            },
          },
        },
        tasks: progressTasks(prev.tasks, "friendPark", 1),
        log: appendLog(prev.log, `${getCarModel(car?.modelId)?.name || "车辆"} 抢到 ${friend?.name || "好友"} 的车位`),
      };
    });
  }

  function pullOut(carUid) {
    setState((prev) => {
      const nextOwn = prev.parkedOwn.filter((id) => id !== carUid);

      let nextFriendLots = { ...prev.friendLots };
      for (const friend of FRIENDS) {
        const slots = nextFriendLots[friend.id] || [];
        const index = slots.findIndex((s) => s.type === "player" && s.carUid === carUid);
        if (index !== -1) {
          const cloned = [...slots];
          cloned[index] = createEmptySlot();
          nextFriendLots[friend.id] = cloned;
          break;
        }
      }

      const car = getCarByUid(prev.cars, carUid);
      return {
        ...prev,
        parkedOwn: nextOwn,
        friendLots: nextFriendLots,
        log: appendLog(prev.log, `${getCarModel(car?.modelId)?.name || "车辆"} 已驶离`),
      };
    });
  }

  function actAgainstIllegal(friendId, slotId, type) {
    setState((prev) => {
      const slots = prev.friendLots[friendId] || [];
      const index = slots.findIndex((s) => s.slotId === slotId);
      if (index === -1) return prev;
      const slot = slots[index];
      if (slot.type !== "npc" || !slot.illegal) return prev;

      const cloned = [...slots];
      const reward = type === "report" ? 1200 : 450;

      if (type === "report") {
        cloned[index] = createEmptySlot();
      } else {
        cloned[index] = { ...slot, illegal: false, ticketed: true };
      }

      const friend = FRIENDS.find((f) => f.id === friendId);
      return {
        ...prev,
        cash: prev.cash + reward,
        exp: prev.exp + (type === "report" ? 2.4 : 1.1),
        friendLots: { ...prev.friendLots, [friendId]: cloned },
        interaction: {
          totalTicket: prev.interaction.totalTicket + (type === "ticket" ? 1 : 0),
          totalReport: prev.interaction.totalReport + (type === "report" ? 1 : 0),
          byFriend: {
            ...prev.interaction.byFriend,
            [friendId]: {
              ...prev.interaction.byFriend[friendId],
              ticket:
                prev.interaction.byFriend[friendId].ticket + (type === "ticket" ? 1 : 0),
              report:
                prev.interaction.byFriend[friendId].report + (type === "report" ? 1 : 0),
            },
          },
        },
        tasks: progressTasks(prev.tasks, "enforce", 1),
        log: appendLog(
          prev.log,
          `${type === "report" ? "举报" : "贴条"} ${friend?.name || "好友"} 车场违停，获得 ${formatMoney(reward)}`
        ),
      };
    });
  }

  function upgradeSlots() {
    setState((prev) => {
      if (!canUpgradeSlots || prev.cash < slotUpgradeCost) return prev;
      return {
        ...prev,
        cash: prev.cash - slotUpgradeCost,
        slots: prev.slots + 1,
        log: appendLog(prev.log, `扩建车位到 ${prev.slots + 1} 个`),
      };
    });
  }

  function repairCar(carUid) {
    setState((prev) => {
      const car = getCarByUid(prev.cars, carUid);
      if (!car) return prev;
      const need = Math.max(0, 100 - car.condition);
      if (need <= 0) return prev;
      const cost = need * 420;
      if (prev.cash < cost) return prev;
      return {
        ...prev,
        cash: prev.cash - cost,
        cars: prev.cars.map((item) =>
          item.uid === carUid ? { ...item, condition: 100 } : item
        ),
        log: appendLog(prev.log, `${getCarModel(car.modelId)?.name} 完成保养，花费 ${formatMoney(cost)}`),
      };
    });
  }

  function claimTask(taskId) {
    setState((prev) => {
      const task = prev.tasks.find((t) => t.id === taskId);
      if (!task || task.claimed || task.progress < task.target) return prev;
      return {
        ...prev,
        cash: prev.cash + task.rewardCash,
        exp: prev.exp + task.rewardExp,
        tasks: prev.tasks.map((t) =>
          t.id === taskId ? { ...t, claimed: true } : t
        ),
        log: appendLog(prev.log, `任务完成：${task.title}，奖励 ${formatMoney(task.rewardCash)}`),
      };
    });
  }

  function resetGame() {
    setState(defaultState());
  }

  return (
    <div className="app">
      <header className="topbar">
        <h1>QQ抢车位</h1>
        <div className="stats">
          <span>现金：{formatMoney(state.cash)}</span>
          <span>等级：Lv.{state.level}</span>
          <span>经验：{Math.floor(state.exp)}</span>
          <span>累计收入：{formatMoney(state.totalEarned)}</span>
        </div>
      </header>

      <section className="event-bar">
        <div>{state.activeEventText}</div>
        <div>
          {state.tempBuff ? `当前加成：${state.tempBuff.label}` : "当前加成：无"}
        </div>
      </section>

      <nav className="tabs">
        <button className={activeTab === "parking" ? "active" : ""} onClick={() => setActiveTab("parking")}>
          停车场
        </button>
        <button className={activeTab === "friends" ? "active" : ""} onClick={() => setActiveTab("friends")}>
          好友抢位
        </button>
        <button className={activeTab === "market" ? "active" : ""} onClick={() => setActiveTab("market")}>
          车市
        </button>
        <button className={activeTab === "garage" ? "active" : ""} onClick={() => setActiveTab("garage")}>
          车库折旧
        </button>
        <button className={activeTab === "tasks" ? "active" : ""} onClick={() => setActiveTab("tasks")}>
          任务系统
        </button>
      </nav>

      {activeTab === "parking" && (
        <section className="panel">
          <h2>我的停车场（{state.parkedOwn.length}/{state.slots}）</h2>
          <div className="slot-grid">
            {Array.from({ length: state.slots }).map((_, i) => {
              const parkedUid = state.parkedOwn[i];
              const car = parkedUid ? getCarByUid(state.cars, parkedUid) : null;
              const model = car ? getCarModel(car.modelId) : null;
              return (
                <div key={i} className="slot">
                  {car ? (
                    <>
                      <div className="car-name">{model?.name}</div>
                      <div className="income">
                        {formatMoney(carIncomePerMinute(car))}/分钟
                      </div>
                      <div className="hint">车况 {car.condition.toFixed(1)}%</div>
                      <button onClick={() => pullOut(car.uid)}>驶离</button>
                    </>
                  ) : (
                    <>
                      <div className="empty">空位</div>
                      {freeCars[0] ? (
                        <button onClick={() => parkInOwnSlot(freeCars[0].uid)}>
                          停入 {getCarModel(freeCars[0].modelId)?.name}
                        </button>
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
            <button onClick={upgradeSlots}>扩建车位（{formatMoney(slotUpgradeCost)}）</button>
            {!canUpgradeSlots && <span className="hint">需要等级达到 {state.slots}</span>}
          </div>
        </section>
      )}

      {activeTab === "friends" && (
        <section className="panel">
          <h2>好友停车场 / 贴条举报</h2>

          <div className="ranking-card">
            <h3>好友互动排行榜</h3>
            <table>
              <thead>
                <tr>
                  <th>好友</th>
                  <th>贴条</th>
                  <th>举报</th>
                  <th>抢位</th>
                  <th>互动分</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((r) => (
                  <tr key={r.id}>
                    <td>{r.name}</td>
                    <td>{r.ticket}</td>
                    <td>{r.report}</td>
                    <td>{r.park}</td>
                    <td>{r.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {FRIENDS.map((friend) => {
            const slots = state.friendLots[friend.id] || [];
            const emptySlotCount = slots.filter((s) => s.type === "empty").length;
            return (
              <div key={friend.id} className="friend-card">
                <div>
                  <strong>{friend.name}</strong>
                  <span>
                    车位 {friend.slots - emptySlotCount}/{friend.slots}
                  </span>
                </div>

                <div className="friend-slots">
                  {slots.map((slot) => {
                    if (slot.type === "empty") {
                      return (
                        <div key={slot.slotId} className="friend-slot friend-empty">
                          空位
                        </div>
                      );
                    }

                    if (slot.type === "player") {
                      const car = getCarByUid(state.cars, slot.carUid);
                      const model = car ? getCarModel(car.modelId) : null;
                      return (
                        <div key={slot.slotId} className="friend-slot friend-player">
                          <div>我的 {model?.name || "车辆"}</div>
                          <button onClick={() => pullOut(slot.carUid)}>取回</button>
                        </div>
                      );
                    }

                    return (
                      <div key={slot.slotId} className="friend-slot friend-npc">
                        <div>{slot.owner} 的 {slot.carLabel}</div>
                        <div className={slot.illegal ? "illegal" : "legal"}>
                          {slot.illegal ? "违停" : "正常停车"}
                        </div>
                        {slot.illegal ? (
                          <div className="actions">
                            <button onClick={() => actAgainstIllegal(friend.id, slot.slotId, "ticket")}>贴条</button>
                            <button onClick={() => actAgainstIllegal(friend.id, slot.slotId, "report")}>举报</button>
                          </div>
                        ) : (
                          <span className="hint">已处理</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {emptySlotCount > 0 && freeCars.length > 0 && (
                  <button onClick={() => parkAtFriend(freeCars[0].uid, friend.id)}>
                    抢位停入 {getCarModel(freeCars[0].modelId)?.name}
                  </button>
                )}
                {emptySlotCount === 0 && <span className="hint">暂无空位</span>}
              </div>
            );
          })}
        </section>
      )}

      {activeTab === "market" && (
        <section className="panel">
          <h2>车市</h2>
          <div className="market-list">
            {CARS.map((car) => (
              <div key={car.id} className="market-item">
                <div>
                  <strong>{car.name}</strong>
                  <div>{formatMoney(car.price)}</div>
                  <div>{formatMoney(car.incomePerHour)}/小时（满车况）</div>
                </div>
                <button disabled={state.cash < car.price} onClick={() => buyCar(car.id)}>
                  购买
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {activeTab === "garage" && (
        <section className="panel">
          <h2>车库折旧（{state.cars.length}）</h2>
          <div className="garage-list">
            {state.cars.map((car) => {
              const model = getCarModel(car.modelId);
              const upkeepCost = Math.max(0, (100 - car.condition) * 420);
              return (
                <div key={car.uid} className="garage-item garage-rich">
                  <div>
                    <strong>{model?.name}</strong>
                    <div>车况：{car.condition.toFixed(1)}%</div>
                    <div>里程：{car.mileage.toFixed(1)} km</div>
                    <div>当前收益：{formatMoney(carIncomePerMinute(car) * 60)}/小时</div>
                    <div>估值：{formatMoney(computeResale(car))}</div>
                  </div>
                  <button disabled={upkeepCost <= 0 || state.cash < upkeepCost} onClick={() => repairCar(car.uid)}>
                    保养 {formatMoney(upkeepCost)}
                  </button>
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
                  <div>
                    <strong>{task.title}</strong>
                    <div>
                      进度：{Math.floor(task.progress)}/{task.target}
                    </div>
                    <div>
                      奖励：{formatMoney(task.rewardCash)} + {task.rewardExp} EXP
                    </div>
                  </div>
                  <button disabled={!done || task.claimed} onClick={() => claimTask(task.id)}>
                    {task.claimed ? "已领取" : done ? "领取" : "未完成"}
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <aside className="log-panel">
        <div className="log-head">
          <h3>系统消息</h3>
          <button onClick={resetGame}>重开存档</button>
        </div>
        <ul>
          {state.log.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
