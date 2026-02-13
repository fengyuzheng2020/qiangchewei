import { CARS, EVENT_INTERVAL_MS, MINUTE_MS } from "../config/gameConfig.js";

function uid(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getCarModel(modelId) {
  return CARS.find((c) => c.id === modelId);
}

function createOwnedCar(modelId) {
  const model = getCarModel(modelId);
  return { uid: uid("car"), modelId, buyPrice: model?.price || 0, condition: 100, mileage: 0 };
}

function createTasks() {
  return [
    { id: "t-buy-2", title: "购入 2 辆车", key: "buyCar", target: 2, progress: 0, rewardCash: 12000, rewardExp: 16, claimed: false },
    { id: "t-friend-2", title: "抢占好友车位 2 次", key: "friendPark", target: 2, progress: 0, rewardCash: 10000, rewardExp: 12, claimed: false },
    { id: "t-earn-30000", title: "累计经营收入 30000", key: "earnCash", target: 30000, progress: 0, rewardCash: 22000, rewardExp: 35, claimed: false },
  ];
}

function appendLog(log, text) {
  return [text, ...(Array.isArray(log) ? log : [])].slice(0, 20);
}

function progressTasks(tasks, key, value = 1) {
  return (tasks || []).map((task) => {
    if (task.key !== key || task.claimed) return task;
    return { ...task, progress: Math.min(task.target, task.progress + value) };
  });
}

function carIncomePerMinute(car, multiplier = 1) {
  const model = getCarModel(car.modelId);
  if (!model) return 0;
  const depreciationFactor = Math.max(0.35, car.condition / 100);
  const brandFactor = model.brandBonus || 1;
  return (model.incomePerHour / 60) * brandFactor * depreciationFactor * multiplier;
}

function maybeTriggerRandomEvent(prev, cars) {
  const rand = Math.random();
  if (rand < 0.2) {
    const bonus = 6000 + Math.floor(Math.random() * 4000);
    return {
      ...prev,
      cash: prev.cash + bonus,
      exp: prev.exp + 6,
      activeEventText: `随机事件：城建补贴到账 ¥${Math.floor(bonus).toLocaleString("zh-CN")}`,
      log: appendLog(prev.log, `随机事件：你收到市政补贴 ¥${Math.floor(bonus).toLocaleString("zh-CN")}`),
    };
  }

  if (rand < 0.45) {
    const activeCars = cars.filter((c) => c.condition < 100);
    if (activeCars.length > 0) {
      const chosen = activeCars[Math.floor(Math.random() * activeCars.length)];
      return {
        ...prev,
        cars: cars.map((c) => (c.uid === chosen.uid ? { ...c, condition: Math.min(100, c.condition + 10) } : c)),
        activeEventText: "随机事件：车辆保养日，部分车辆状态恢复",
        log: appendLog(prev.log, `随机事件：${getCarModel(chosen.modelId)?.name} 状态 +10`),
      };
    }
  }

  if (rand < 0.7) {
    return {
      ...prev,
      tempBuff: { multiplier: 1.18, expiresAt: Date.now() + 6 * MINUTE_MS, label: "商圈高峰（收益+18%）" },
      activeEventText: "随机事件：商圈高峰，短时收益提升",
      log: appendLog(prev.log, "随机事件：商圈高峰触发，6分钟内收益+18%"),
    };
  }

  const eligible = cars.filter((c) => c.condition > 45);
  if (eligible.length > 0) {
    const chosen = eligible[Math.floor(Math.random() * eligible.length)];
    return {
      ...prev,
      cars: cars.map((c) => (c.uid === chosen.uid ? { ...c, condition: c.condition - 8 } : c)),
      activeEventText: "随机事件：剐蹭事故，车辆状态下降",
      log: appendLog(prev.log, `随机事件：${getCarModel(chosen.modelId)?.name} 发生剐蹭，状态 -8`),
    };
  }

  return prev;
}

function getCarByUid(cars, carUid) {
  return (cars || []).find((c) => c.uid === carUid);
}

export function defaultGameState() {
  const starter = createOwnedCar(CARS[0].id);
  return {
    cash: 120000,
    level: 1,
    exp: 0,
    slots: 2,
    cars: [starter],
    parkedOwn: [starter.uid],
    friendParked: [],
    interaction: { totalTicket: 0, totalReport: 0, byFriend: {} },
    tasks: createTasks(),
    totalEarned: 0,
    tempBuff: null,
    activeEventText: "城市经营系统已上线。",
    lastTickAt: Date.now(),
    lastEventAt: Date.now(),
    lastTaskResetAt: Date.now(),
    log: ["欢迎来到抢车位 Web版"],
  };
}

export function settleState(prev) {
  const now = Date.now();
  const deltaMin = (now - (prev.lastTickAt || now)) / MINUTE_MS;
  if (deltaMin <= 0) return prev;

  const buffMultiplier = prev.tempBuff && prev.tempBuff.expiresAt > now ? prev.tempBuff.multiplier : 1;
  const friendParkedSet = new Set(prev.friendParked || []);
  let earned = 0;

  const nextCars = (prev.cars || []).map((car) => {
    const inOwn = (prev.parkedOwn || []).includes(car.uid);
    const inFriend = friendParkedSet.has(car.uid);
    if (!inOwn && !inFriend) return car;
    const lotMultiplier = inFriend ? 1.25 : 1;
    earned += carIncomePerMinute(car, lotMultiplier * buffMultiplier) * deltaMin;
    const wearRate = inFriend ? 0.065 : 0.05;
    return { ...car, condition: Math.max(30, car.condition - wearRate * deltaMin), mileage: car.mileage + 0.85 * deltaMin };
  });

  let next = {
    ...prev,
    cars: nextCars,
    cash: prev.cash + earned,
    totalEarned: prev.totalEarned + earned,
    exp: prev.exp + earned / 450,
    level: Math.max(prev.level, Math.floor((prev.exp + earned / 450) / 100) + 1),
    tempBuff: prev.tempBuff && prev.tempBuff.expiresAt > now ? prev.tempBuff : null,
    tasks: progressTasks(prev.tasks || [], "earnCash", earned),
    lastTickAt: now,
  };

  if (now - (prev.lastTaskResetAt || now) >= 24 * 60 * MINUTE_MS) {
    next.tasks = createTasks();
    next.lastTaskResetAt = now;
    next.log = appendLog(next.log, "每日任务已刷新");
  }

  if (now - (prev.lastEventAt || now) >= EVENT_INTERVAL_MS && Math.random() < 0.42) {
    next = maybeTriggerRandomEvent(next, next.cars);
    next.lastEventAt = now;
  } else if (now - (prev.lastEventAt || now) >= EVENT_INTERVAL_MS) {
    next.lastEventAt = now;
  }

  return next;
}

export function applyAction(state, action, payload = {}) {
  const prev = settleState(state);

  if (action === "sync") return prev;

  if (action === "buyCar") {
    const model = getCarModel(payload.modelId);
    if (!model) throw new Error("车型不存在");
    if (prev.cash < model.price || prev.level < (model.levelReq || 1)) throw new Error("购买条件不满足");
    const newCar = createOwnedCar(model.id);
    return {
      ...prev,
      cash: prev.cash - model.price,
      cars: [...prev.cars, newCar],
      tasks: progressTasks(prev.tasks, "buyCar", 1),
      log: appendLog(prev.log, `买入 ${model.name}`),
    };
  }

  if (action === "parkOwn") {
    const carUid = payload.carUid;
    if (prev.parkedOwn.length >= prev.slots) throw new Error("车位已满");
    if (!prev.cars.some((c) => c.uid === carUid)) throw new Error("车辆不存在");
    if (prev.parkedOwn.includes(carUid)) throw new Error("车辆已停入");
    if ((prev.friendParked || []).includes(carUid)) throw new Error("车辆在好友车场");
    const car = getCarByUid(prev.cars, carUid);
    return { ...prev, parkedOwn: [...prev.parkedOwn, carUid], log: appendLog(prev.log, `${getCarModel(car?.modelId)?.name || "车辆"} 停入自己的车位`) };
  }

  if (action === "parkFriend") {
    const { carUid, friendUserId } = payload;
    if (!prev.cars.some((c) => c.uid === carUid)) throw new Error("车辆不存在");
    if (prev.parkedOwn.includes(carUid)) throw new Error("车辆在自己车位");
    if ((prev.friendParked || []).includes(carUid)) throw new Error("车辆已在好友车位");
    const car = getCarByUid(prev.cars, carUid);
    const key = String(friendUserId);
    const old = prev.interaction?.byFriend?.[key] || { ticket: 0, report: 0, park: 0 };
    return {
      ...prev,
      friendParked: [...(prev.friendParked || []), carUid],
      interaction: { ...prev.interaction, byFriend: { ...(prev.interaction?.byFriend || {}), [key]: { ...old, park: old.park + 1 } } },
      tasks: progressTasks(prev.tasks, "friendPark", 1),
      log: appendLog(prev.log, `${getCarModel(car?.modelId)?.name || "车辆"} 抢到好友车位`),
    };
  }

  if (action === "pullOut") {
    const carUid = payload.carUid;
    const nextOwn = (prev.parkedOwn || []).filter((id) => id !== carUid);
    const nextFriend = (prev.friendParked || []).filter((id) => id !== carUid);
    const car = getCarByUid(prev.cars, carUid);
    return {
      ...prev,
      parkedOwn: nextOwn,
      friendParked: nextFriend,
      log: appendLog(prev.log, `${getCarModel(car?.modelId)?.name || "车辆"} 已驶离`),
    };
  }

  if (action === "upgradeSlots") {
    const slotUpgradeCost = prev.slots * 90000;
    if (prev.level < prev.slots || prev.cash < slotUpgradeCost) throw new Error("扩建条件不满足");
    return { ...prev, cash: prev.cash - slotUpgradeCost, slots: prev.slots + 1, log: appendLog(prev.log, `扩建车位到 ${prev.slots + 1} 个`) };
  }

  if (action === "repairCar") {
    const car = getCarByUid(prev.cars, payload.carUid);
    if (!car) throw new Error("车辆不存在");
    const model = getCarModel(car.modelId);
    const need = Math.max(0, 100 - car.condition);
    const cost = need * 420 * (model?.maintenanceFactor || 1);
    if (cost <= 0) throw new Error("车辆无需保养");
    if (prev.cash < cost) throw new Error("现金不足");
    return {
      ...prev,
      cash: prev.cash - cost,
      cars: prev.cars.map((item) => (item.uid === payload.carUid ? { ...item, condition: 100 } : item)),
      log: appendLog(prev.log, `${model?.name} 完成保养，花费 ¥${Math.floor(cost).toLocaleString("zh-CN")}`),
    };
  }

  if (action === "claimTask") {
    const task = (prev.tasks || []).find((t) => t.id === payload.taskId);
    if (!task || task.claimed || task.progress < task.target) throw new Error("任务不可领取");
    return {
      ...prev,
      cash: prev.cash + task.rewardCash,
      exp: prev.exp + task.rewardExp,
      tasks: prev.tasks.map((t) => (t.id === payload.taskId ? { ...t, claimed: true } : t)),
      log: appendLog(prev.log, `任务完成：${task.title}，奖励 ¥${Math.floor(task.rewardCash).toLocaleString("zh-CN")}`),
    };
  }

  if (action === "resetGame") {
    return defaultGameState();
  }

  throw new Error("未知动作");
}
