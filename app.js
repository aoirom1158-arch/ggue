const STORAGE_KEY = "vote-app-state";
const DEFAULT_STATE = {
  employees: ["张三", "李四", "王五", "赵六"],
  voteLimit: 3,
  votes: {},
  voters: {},
};

const elements = {
  userInfo: document.getElementById("userInfo"),
  userName: document.querySelector(".user-name"),
  logoutBtn: document.getElementById("logoutBtn"),
  loginCard: document.getElementById("loginCard"),
  wecomLoginBtn: document.getElementById("wecomLoginBtn"),
  mockLoginBtn: document.getElementById("mockLoginBtn"),
  mockNameInput: document.getElementById("mockNameInput"),
  votingCard: document.getElementById("votingCard"),
  employeeList: document.getElementById("employeeList"),
  portal: document.getElementById("portal"),
  voteQuota: document.getElementById("voteQuota"),
  employeeInput: document.getElementById("employeeInput"),
  voteLimitInput: document.getElementById("voteLimitInput"),
  saveSettingsBtn: document.getElementById("saveSettingsBtn"),
  resetBtn: document.getElementById("resetBtn"),
};

const channel = new BroadcastChannel("vote-app");
let state = loadState();
let currentUser = null;

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    return structuredClone(DEFAULT_STATE);
  }
  const parsed = JSON.parse(saved);
  return {
    ...DEFAULT_STATE,
    ...parsed,
    votes: parsed.votes || {},
    voters: parsed.voters || {},
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  channel.postMessage({ type: "sync" });
}

function updateUserInfo() {
  const loggedIn = Boolean(currentUser);
  elements.userInfo.classList.toggle("logged-in", loggedIn);
  elements.userName.textContent = loggedIn ? `${currentUser.name}` : "未登录";
  elements.logoutBtn.style.display = loggedIn ? "inline-flex" : "none";
  elements.loginCard.style.display = loggedIn ? "none" : "block";
  elements.votingCard.classList.toggle("disabled", !loggedIn);
}

function getRemainingVotes(user) {
  if (!user) return 0;
  const used = state.voters[user.id] || 0;
  return Math.max(state.voteLimit - used, 0);
}

function renderVotingList() {
  elements.employeeList.innerHTML = "";
  const remaining = getRemainingVotes(currentUser);
  elements.voteQuota.textContent = `可投票次数：${remaining}`;

  state.employees.forEach((name) => {
    const row = document.createElement("div");
    row.className = "employee";

    const info = document.createElement("div");
    info.innerHTML = `<div class="employee-name">${name}</div>`;

    const actions = document.createElement("div");
    actions.className = "employee-actions";

    const count = document.createElement("span");
    count.className = "vote-count";
    count.textContent = `${state.votes[name] || 0} 票`;

    const button = document.createElement("button");
    button.className = "primary";
    button.textContent = "投票";
    button.disabled = !currentUser || remaining === 0;
    button.addEventListener("click", () => handleVote(name));

    actions.append(count, button);
    row.append(info, actions);
    elements.employeeList.appendChild(row);
  });
}

function renderPortal() {
  elements.portal.innerHTML = "";
  const totals = state.employees.map((name) => state.votes[name] || 0);
  const maxVotes = Math.max(1, ...totals);

  state.employees.forEach((name) => {
    const votes = state.votes[name] || 0;
    const row = document.createElement("div");
    row.className = "portal-row";
    const label = document.createElement("strong");
    label.textContent = name;
    const progress = document.createElement("div");
    progress.className = "progress";
    const bar = document.createElement("span");
    bar.style.width = `${(votes / maxVotes) * 100}%`;
    progress.appendChild(bar);
    const count = document.createElement("span");
    count.textContent = `${votes} 票`;

    row.append(label, progress, count);
    elements.portal.appendChild(row);
  });
}

function renderSettings() {
  elements.employeeInput.value = state.employees.join(",");
  elements.voteLimitInput.value = state.voteLimit;
}

function renderAll() {
  updateUserInfo();
  renderVotingList();
  renderPortal();
  renderSettings();
}

function handleVote(name) {
  if (!currentUser) return;
  const remaining = getRemainingVotes(currentUser);
  if (remaining <= 0) return;

  state.votes[name] = (state.votes[name] || 0) + 1;
  state.voters[currentUser.id] = (state.voters[currentUser.id] || 0) + 1;
  saveState();
  renderVotingList();
  renderPortal();
}

function handleSettingsSave() {
  const names = elements.employeeInput.value
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);

  if (names.length === 0) {
    alert("请至少输入一位员工姓名。");
    return;
  }

  const limit = Number(elements.voteLimitInput.value);
  if (!Number.isInteger(limit) || limit <= 0) {
    alert("请输入有效的投票次数。");
    return;
  }

  state.employees = names;
  state.voteLimit = limit;

  const newVotes = {};
  names.forEach((name) => {
    newVotes[name] = state.votes[name] || 0;
  });
  state.votes = newVotes;

  saveState();
  renderAll();
}

function handleReset() {
  if (!confirm("确认重置所有票数？")) return;
  state.votes = {};
  state.voters = {};
  saveState();
  renderAll();
}

function parseWecomUser() {
  const params = new URLSearchParams(window.location.search);
  const userId = params.get("userId");
  const userName = params.get("name");
  if (userId && userName) {
    return { id: userId, name: userName };
  }
  return null;
}

function wecomLogin() {
  const wecomConfig = {
    corpId: "YOUR_CORP_ID",
    agentId: "YOUR_AGENT_ID",
    redirectUri: window.location.origin + window.location.pathname,
  };

  const authUrl = `https://open.work.weixin.qq.com/wwopen/sso/qrConnect?appid=${wecomConfig.corpId}&agentid=${wecomConfig.agentId}&redirect_uri=${encodeURIComponent(
    wecomConfig.redirectUri
  )}&state=vote_app`;

  window.location.href = authUrl;
}

function mockLogin() {
  const name = elements.mockNameInput.value.trim();
  if (!name) {
    alert("请输入姓名。");
    return;
  }
  currentUser = {
    id: `mock-${name}`,
    name,
  };
  renderAll();
}

function logout() {
  currentUser = null;
  renderAll();
}

window.addEventListener("storage", (event) => {
  if (event.key === STORAGE_KEY) {
    state = loadState();
    renderAll();
  }
});

channel.addEventListener("message", () => {
  state = loadState();
  renderAll();
});

function init() {
  const wecomUser = parseWecomUser();
  currentUser = wecomUser;
  renderAll();
}

init();

elements.wecomLoginBtn.addEventListener("click", wecomLogin);
elements.mockLoginBtn.addEventListener("click", mockLogin);
elements.logoutBtn.addEventListener("click", logout);
elements.saveSettingsBtn.addEventListener("click", handleSettingsSave);
elements.resetBtn.addEventListener("click", handleReset);
