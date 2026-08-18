(function () {
  "use strict";

  var STORAGE_CLIENTS = "lais_clientes_v1";

  function loadClients() {
    try { var raw = localStorage.getItem(STORAGE_CLIENTS); return raw ? JSON.parse(raw) : []; }
    catch (e) { return []; }
  }
  function saveClients(list) { localStorage.setItem(STORAGE_CLIENTS, JSON.stringify(list)); }

  var clients = loadClients();
  var statusFilter = "todos";
  var editingId = null;

  function fmtBRL(n) {
    n = Math.round(((n || 0) + Number.EPSILON) * 100) / 100;
    return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }
  function fmtDate(iso) {
    if (!iso) return "—";
    var parts = iso.split("-");
    if (parts.length !== 3) return iso;
    return parts[2] + "/" + parts[1] + "/" + parts[0];
  }
  function todayISO() { return new Date().toISOString().slice(0, 10); }
  function daysUntil(iso) {
    if (!iso) return null;
    var today = new Date(todayISO() + "T00:00:00");
    var target = new Date(iso + "T00:00:00");
    return Math.round((target - today) / 86400000);
  }

  function clientStatus(c) {
    if (c.pagoTotal) return "pago";
    if (c.pago50) return "parcial";
    return "aberto";
  }
  function receivedAmount(c) {
    if (c.pagoTotal) return c.valorNegociado;
    if (c.pago50) return c.valorNegociado / 2;
    return 0;
  }
  function statusLabel(s) {
    return s === "pago" ? "pago integral" : s === "parcial" ? "50% pago" : "aguardando pagamento";
  }

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str || "";
    return div.innerHTML;
  }

  /* ---------------- stats ---------------- */
  function renderStats() {
    var totalNegociado = clients.reduce(function (s, c) { return s + (c.valorNegociado || 0); }, 0);
    var totalRecebido = clients.reduce(function (s, c) { return s + receivedAmount(c); }, 0);
    var totalAReceber = totalNegociado - totalRecebido;
    var box = document.getElementById("stats-row");
    box.innerHTML = [
      ["clientes fechados", clients.length, false],
      ["total negociado", fmtBRL(totalNegociado), false],
      ["já recebido", fmtBRL(totalRecebido), false],
      ["a receber", fmtBRL(totalAReceber), true]
    ].map(function (s) {
      return '<div class="stat-box' + (s[2] ? " accent" : "") + '"><div class="s-lbl">' + s[0] + '</div><div class="s-val">' + s[1] + '</div></div>';
    }).join("");
  }

  /* ---------------- deadlines ---------------- */
  function renderDeadlines() {
    var box = document.getElementById("deadlines-list");
    var upcoming = clients.filter(function (c) { return c.prazo && !c.pagoTotal; })
      .sort(function (a, b) { return a.prazo < b.prazo ? -1 : 1; })
      .slice(0, 6);
    if (!upcoming.length) {
      box.innerHTML = '<div class="deadline-empty">nenhum prazo pendente no momento</div>';
      return;
    }
    box.innerHTML = upcoming.map(function (c) {
      var d = daysUntil(c.prazo);
      var cls = d < 0 ? "overdue" : d <= 7 ? "soon" : "";
      var msg = d < 0 ? Math.abs(d) + " dia" + (Math.abs(d) === 1 ? "" : "s") + " atrasado" : d === 0 ? "entrega hoje" : "em " + d + " dia" + (d === 1 ? "" : "s");
      return '<div class="deadline-item ' + cls + '" data-open="' + c.id + '">' +
        '<div><div class="d-name">' + escapeHtml(c.nome) + '</div><div class="d-date">' + fmtDate(c.prazo) + ' · ' + msg + '</div></div>' +
        '<span class="status-badge ' + clientStatus(c) + '">' + statusLabel(clientStatus(c)) + '</span></div>';
    }).join("");
  }

  /* ---------------- client list ---------------- */
  function renderList() {
    var box = document.getElementById("client-list");
    var filtered = clients.filter(function (c) { return statusFilter === "todos" || clientStatus(c) === statusFilter; })
      .sort(function (a, b) { return (b.criadoEm || "").localeCompare(a.criadoEm || ""); });
    if (!filtered.length) {
      box.innerHTML = '<div class="client-empty">nenhum cliente encontrado neste filtro</div>';
      return;
    }
    box.innerHTML = filtered.map(function (c) {
      var st = clientStatus(c);
      return '<div class="client-card" data-open="' + c.id + '">' +
        '<div><div class="cc-name">' + escapeHtml(c.nome) + '</div><div class="cc-scope">' + escapeHtml((c.escopo || "").replace(/\n/g, " ")) + '</div></div>' +
        '<div class="cc-col"><span class="k">valor negociado</span>' + fmtBRL(c.valorNegociado) + '</div>' +
        '<div class="cc-col"><span class="k">prazo</span>' + fmtDate(c.prazo) + '</div>' +
        '<div class="cc-status"><span class="status-badge ' + st + '">' + statusLabel(st) + '</span></div>' +
        '</div>';
    }).join("");
  }

  function renderAll() { renderStats(); renderDeadlines(); renderList(); }

  document.getElementById("status-filter").addEventListener("click", function (e) {
    var chip = e.target.closest(".chip");
    if (!chip) return;
    statusFilter = chip.dataset.val;
    this.querySelectorAll(".chip").forEach(function (c) { c.classList.toggle("active", c === chip); });
    renderList();
  });

  document.addEventListener("click", function (e) {
    var opener = e.target.closest("[data-open]");
    if (opener) openDetail(opener.dataset.open);
  });

  /* ---------------- form modal (novo / editar) ---------------- */
  function openForm(client) {
    editingId = client ? client.id : null;
    document.getElementById("client-form-title").textContent = client ? "editar cliente" : "novo cliente";
    document.getElementById("f-nome").value = client ? client.nome : "";
    document.getElementById("f-data").value = client ? client.dataFechamento : todayISO();
    document.getElementById("f-prazo").value = client ? client.prazo : "";
    document.getElementById("f-valor-proposta").value = client ? client.valorProposta : "";
    document.getElementById("f-valor-negociado").value = client ? client.valorNegociado : "";
    document.getElementById("f-escopo").value = client ? client.escopo : "";
    document.getElementById("f-pago50").checked = client ? !!client.pago50 : false;
    document.getElementById("f-pagototal").checked = client ? !!client.pagoTotal : false;
    document.getElementById("client-form-overlay").classList.add("open");
  }
  document.getElementById("btn-new-client").addEventListener("click", function () { openForm(null); });
  document.getElementById("btn-cancel-form").addEventListener("click", function () {
    document.getElementById("client-form-overlay").classList.remove("open");
  });
  document.getElementById("client-form-overlay").addEventListener("click", function (e) {
    if (e.target === this) this.classList.remove("open");
  });
  document.getElementById("btn-save-form").addEventListener("click", function () {
    var nome = document.getElementById("f-nome").value.trim();
    if (!nome) { showToast("informe o nome do cliente"); return; }
    var data = {
      nome: nome,
      dataFechamento: document.getElementById("f-data").value,
      prazo: document.getElementById("f-prazo").value,
      valorProposta: parseFloat(document.getElementById("f-valor-proposta").value) || 0,
      valorNegociado: parseFloat(document.getElementById("f-valor-negociado").value) || 0,
      escopo: document.getElementById("f-escopo").value.trim(),
      pago50: document.getElementById("f-pago50").checked,
      pagoTotal: document.getElementById("f-pagototal").checked
    };
    if (editingId) {
      clients = clients.map(function (c) { return c.id === editingId ? Object.assign({}, c, data) : c; });
    } else {
      data.id = Date.now() + Math.random().toString(16).slice(2);
      data.criadoEm = new Date().toISOString();
      clients.push(data);
    }
    saveClients(clients);
    document.getElementById("client-form-overlay").classList.remove("open");
    renderAll();
    showToast(editingId ? "cliente atualizado" : "cliente adicionado");
  });

  /* ---------------- detail modal ---------------- */
  function openDetail(id) {
    var c = clients.find(function (x) { return x.id === id; });
    if (!c) return;
    var st = clientStatus(c);
    var received = receivedAmount(c);
    var pct = c.valorNegociado ? Math.round((received / c.valorNegociado) * 100) : 0;
    var body = document.getElementById("client-detail-body");
    body.innerHTML =
      '<div class="detail-head"><h3>' + escapeHtml(c.nome) + '</h3><span class="status-badge ' + st + '">' + statusLabel(st) + '</span></div>' +
      '<div class="detail-grid">' +
        '<div class="dg-item"><span class="k">data de fechamento</span><div class="v">' + fmtDate(c.dataFechamento) + '</div></div>' +
        '<div class="dg-item"><span class="k">prazo de entrega</span><div class="v">' + fmtDate(c.prazo) + '</div></div>' +
        '<div class="dg-item"><span class="k">valor da proposta</span><div class="v">' + fmtBRL(c.valorProposta) + '</div></div>' +
        '<div class="dg-item"><span class="k">valor negociado</span><div class="v">' + fmtBRL(c.valorNegociado) + '</div></div>' +
      '</div>' +
      '<div class="detail-progress"><div class="bar"><div class="bar-fill" style="width:' + pct + '%"></div></div>' +
        '<div class="bar-lbl"><span>recebido: ' + fmtBRL(received) + '</span><span>' + pct + '%</span></div></div>' +
      (c.escopo ? '<div class="detail-scope">' + escapeHtml(c.escopo) + '</div>' : '') +
      '<div class="detail-actions">' +
        (c.pago50 ? "" : '<button class="btn btn-ghost" data-action="pago50">marcar 50% pago</button>') +
        (c.pagoTotal ? "" : '<button class="btn btn-primary" data-action="pagototal">marcar pago integral</button>') +
        '<button class="btn btn-ghost" data-action="editar">editar</button>' +
        '<button class="btn btn-danger" data-action="excluir">excluir</button>' +
      '</div>';
    body.dataset.clientId = id;
    document.getElementById("client-detail-overlay").classList.add("open");
  }
  document.getElementById("client-detail-overlay").addEventListener("click", function (e) {
    if (e.target === this) this.classList.remove("open");
    var actionBtn = e.target.closest("[data-action]");
    if (!actionBtn) return;
    var id = document.getElementById("client-detail-body").dataset.clientId;
    var c = clients.find(function (x) { return x.id === id; });
    if (!c) return;
    var action = actionBtn.dataset.action;
    if (action === "pago50") {
      c.pago50 = true;
      saveClients(clients);
      renderAll(); openDetail(id);
      showToast("50% marcado como pago");
    } else if (action === "pagototal") {
      c.pago50 = true; c.pagoTotal = true;
      saveClients(clients);
      renderAll(); openDetail(id);
      showToast("pagamento integral confirmado");
    } else if (action === "editar") {
      document.getElementById("client-detail-overlay").classList.remove("open");
      openForm(c);
    } else if (action === "excluir") {
      if (!confirm("Excluir " + c.nome + " da central de clientes?")) return;
      clients = clients.filter(function (x) { return x.id !== id; });
      saveClients(clients);
      document.getElementById("client-detail-overlay").classList.remove("open");
      renderAll();
      showToast("cliente removido");
    }
  });

  /* ---------------- toast ---------------- */
  var toastTimer;
  function showToast(msg) {
    var t = document.getElementById("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("show"); }, 2400);
  }

  renderAll();
})();
