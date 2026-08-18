(function () {
  "use strict";

  var STORAGE_RATES = "lais_precificador_rates_v1";
  var STORAGE_CART = "lais_precificador_cart_v1";
  var WHATSAPP_NUMBER = "5511969288192";

  var DEFAULT_RATES = {
    vray1: 80, vray5: 74, vray10: 71, vray15: 65,
    ia1: 50, ia5: 48, ia10: 46, ia15: 42,
    mdl1: 12, mdl2: 10, mdl3: 8,
    detItens: 70, detAmbientes: 110,
    exeInteriores: 15, exeArquitetonico: 19
  };

  function loadRates() {
    try {
      var raw = localStorage.getItem(STORAGE_RATES);
      if (!raw) return Object.assign({}, DEFAULT_RATES);
      var parsed = JSON.parse(raw);
      return Object.assign({}, DEFAULT_RATES, parsed);
    } catch (e) {
      return Object.assign({}, DEFAULT_RATES);
    }
  }

  function saveRates(rates) {
    localStorage.setItem(STORAGE_RATES, JSON.stringify(rates));
  }

  function loadCart() {
    try {
      var raw = localStorage.getItem(STORAGE_CART);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveCart(cart) {
    localStorage.setItem(STORAGE_CART, JSON.stringify(cart));
  }

  var rates = loadRates();
  var cart = loadCart();

  function fmtBRL(n) {
    n = Math.round((n + Number.EPSILON) * 100) / 100;
    return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  function imgTierRate(qtd, r1, r5, r10, r15) {
    if (qtd >= 15) return r15;
    if (qtd >= 10) return r10;
    if (qtd >= 5) return r5;
    return r1;
  }

  function mdlTierRate(area) {
    if (area > 120) return rates.mdl3;
    if (area >= 51) return rates.mdl2;
    return rates.mdl1;
  }

  /* ---------------- calculators per service ---------------- */

  function calcVray() {
    var qtd = Math.max(1, parseInt(document.getElementById("vray-qtd").value, 10) || 1);
    var rate = imgTierRate(qtd, rates.vray1, rates.vray5, rates.vray10, rates.vray15);
    var total = qtd * rate;
    return {
      total: total,
      rateLabel: fmtBRL(rate) + " / imagem",
      title: "Renderização VRay",
      desc: qtd + (qtd > 1 ? " imagens" : " imagem") + " · " + fmtBRL(rate) + "/img"
    };
  }

  function calcIa() {
    var qtd = Math.max(1, parseInt(document.getElementById("ia-qtd").value, 10) || 1);
    var rate = imgTierRate(qtd, rates.ia1, rates.ia5, rates.ia10, rates.ia15);
    var total = qtd * rate;
    return {
      total: total,
      rateLabel: fmtBRL(rate) + " / imagem",
      title: "Renderização por IA",
      desc: qtd + (qtd > 1 ? " imagens" : " imagem") + " · " + fmtBRL(rate) + "/img"
    };
  }

  function calcModelagem() {
    var area = Math.max(1, parseFloat(document.getElementById("mdl-area").value) || 1);
    var rate = mdlTierRate(area);
    var total = area * rate;
    return {
      total: total,
      rateLabel: fmtBRL(rate) + " / m²",
      title: "Modelagem 3D",
      desc: area + " m² · " + fmtBRL(rate) + "/m²"
    };
  }

  var detModalidade = "itens";
  function calcDetalhamento() {
    var qtd = Math.max(1, parseInt(document.getElementById("det-qtd").value, 10) || 1);
    var isItens = detModalidade === "itens";
    var rate = isItens ? rates.detItens : rates.detAmbientes;
    var total = qtd * rate;
    var unidade = isItens ? "peça" : "ambiente";
    return {
      total: total,
      rateLabel: fmtBRL(rate) + " / " + unidade,
      title: "Detalhamento — " + (isItens ? "Itens" : "Ambientes"),
      desc: qtd + " " + unidade + (qtd > 1 ? "s" : "") + " · " + fmtBRL(rate) + "/" + unidade
    };
  }

  var exeModalidade = "interiores";
  function calcExecutivo() {
    var area = Math.max(1, parseFloat(document.getElementById("exe-area").value) || 1);
    var ajuste = parseFloat(document.getElementById("exe-ajuste").value) || 0;
    var isInteriores = exeModalidade === "interiores";
    var rate = isInteriores ? rates.exeInteriores : rates.exeArquitetonico;
    var base = area * rate;
    var total = base * (1 + ajuste / 100);
    var ajusteTxt = ajuste !== 0 ? " · ajuste " + (ajuste > 0 ? "+" : "") + ajuste + "%" : "";
    return {
      total: total,
      rateLabel: fmtBRL(rate) + " / m²" + ajusteTxt,
      title: "Projeto Executivo — " + (isInteriores ? "Interiores" : "Arquitetônico"),
      desc: area + " m² · " + fmtBRL(rate) + "/m²" + ajusteTxt
    };
  }

  var CALCULATORS = {
    vray: calcVray,
    ia: calcIa,
    modelagem: calcModelagem,
    detalhamento: calcDetalhamento,
    executivo: calcExecutivo
  };

  var currentTab = "vray";

  function updatePreview(key) {
    var result = CALCULATORS[key]();
    var box = document.getElementById(key === "modelagem" ? "mdl-preview" : key + "-preview");
    if (!box) return;
    box.querySelector(".val").textContent = fmtBRL(result.total);
    box.querySelector(".rate").textContent = result.rateLabel;
  }

  function updateAllPreviews() {
    Object.keys(CALCULATORS).forEach(updatePreview);
  }

  /* ---------------- tabs ---------------- */
  document.getElementById("tabs").addEventListener("click", function (e) {
    var btn = e.target.closest(".tab-btn");
    if (!btn) return;
    currentTab = btn.dataset.tab;
    document.querySelectorAll(".tab-btn").forEach(function (b) { b.classList.toggle("active", b === btn); });
    document.querySelectorAll(".pane").forEach(function (p) { p.classList.toggle("active", p.dataset.pane === currentTab); });
  });

  /* ---------------- chip groups ---------------- */
  document.getElementById("det-modalidade").addEventListener("click", function (e) {
    var chip = e.target.closest(".chip");
    if (!chip) return;
    detModalidade = chip.dataset.val;
    this.querySelectorAll(".chip").forEach(function (c) { c.classList.toggle("active", c === chip); });
    document.getElementById("det-label").textContent = detModalidade === "itens" ? "Quantidade de peças" : "Quantidade de ambientes";
    updatePreview("detalhamento");
  });

  document.getElementById("exe-modalidade").addEventListener("click", function (e) {
    var chip = e.target.closest(".chip");
    if (!chip) return;
    exeModalidade = chip.dataset.val;
    this.querySelectorAll(".chip").forEach(function (c) { c.classList.toggle("active", c === chip); });
    updatePreview("executivo");
  });

  /* ---------------- live inputs ---------------- */
  ["vray-qtd", "ia-qtd", "mdl-area", "det-qtd", "exe-area", "exe-ajuste"].forEach(function (id) {
    document.getElementById(id).addEventListener("input", function () {
      var key = id.indexOf("vray") === 0 ? "vray" : id.indexOf("ia") === 0 ? "ia" : id.indexOf("mdl") === 0 ? "modelagem" : id.indexOf("det") === 0 ? "detalhamento" : "executivo";
      updatePreview(key);
    });
  });

  /* ---------------- add to cart ---------------- */
  document.getElementById("btn-add").addEventListener("click", function () {
    var result = CALCULATORS[currentTab]();
    var nota = document.getElementById("item-nota").value.trim();
    cart.push({
      id: Date.now() + Math.random().toString(16).slice(2),
      title: result.title,
      desc: result.desc + (nota ? " — " + nota : ""),
      total: result.total
    });
    document.getElementById("item-nota").value = "";
    saveCart(cart);
    renderCart();
    showToast("item adicionado ao orçamento");
  });

  /* ---------------- cart render ---------------- */
  function renderCart() {
    var list = document.getElementById("cart-list");
    if (cart.length === 0) {
      list.innerHTML = '<div class="cart-empty">nenhum item adicionado ainda</div>';
    } else {
      list.innerHTML = cart.map(function (item) {
        return '<div class="cart-item" data-id="' + item.id + '">' +
          '<div><div class="ci-title">' + escapeHtml(item.title) + '</div>' +
          '<div class="ci-desc">' + escapeHtml(item.desc) + '</div></div>' +
          '<div class="ci-right"><div class="ci-price">' + fmtBRL(item.total) + '</div>' +
          '<button class="ci-remove" data-remove="' + item.id + '">remover</button></div></div>';
      }).join("");
    }
    updateTotals();
  }

  document.getElementById("cart-list").addEventListener("click", function (e) {
    var btn = e.target.closest("[data-remove]");
    if (!btn) return;
    var id = btn.dataset.remove;
    cart = cart.filter(function (item) { return item.id !== id; });
    saveCart(cart);
    renderCart();
  });

  function subtotal() {
    return cart.reduce(function (sum, item) { return sum + item.total; }, 0);
  }

  function updateTotals() {
    var sub = subtotal();
    var pct = parseFloat(document.getElementById("global-adjust").value) || 0;
    var adjustValue = sub * (pct / 100);
    var total = sub + adjustValue;
    document.getElementById("t-subtotal").textContent = fmtBRL(sub);
    document.getElementById("t-adjust").textContent = (adjustValue >= 0 ? "+" : "") + fmtBRL(adjustValue) + (pct ? " (" + pct + "%)" : "");
    document.getElementById("t-total").textContent = fmtBRL(total);

    var waLink = document.getElementById("btn-whatsapp");
    var hasItems = cart.length > 0;
    waLink.style.pointerEvents = hasItems ? "auto" : "none";
    waLink.style.opacity = hasItems ? "1" : ".5";
    waLink.href = "https://api.whatsapp.com/send?phone=" + WHATSAPP_NUMBER + "&text=" + encodeURIComponent(buildQuoteText());
  }

  document.getElementById("global-adjust").addEventListener("input", updateTotals);

  document.getElementById("btn-clear").addEventListener("click", function () {
    if (cart.length === 0) return;
    if (!confirm("Limpar todos os itens do orçamento?")) return;
    cart = [];
    saveCart(cart);
    renderCart();
  });

  /* ---------------- quote text ---------------- */
  function buildQuoteText() {
    if (cart.length === 0) return "";
    var pct = parseFloat(document.getElementById("global-adjust").value) || 0;
    var sub = subtotal();
    var total = sub * (1 + pct / 100);
    var lines = [];
    lines.push("ORÇAMENTO — LAÍS VIEIRA");
    lines.push("");
    cart.forEach(function (item, i) {
      lines.push((i + 1) + ". " + item.title);
      lines.push("   " + item.desc);
      lines.push("   " + fmtBRL(item.total));
      lines.push("");
    });
    lines.push("Subtotal: " + fmtBRL(sub));
    if (pct) lines.push("Ajuste (" + pct + "%): " + fmtBRL(total - sub));
    lines.push("TOTAL: " + fmtBRL(total));
    lines.push("");
    lines.push("Valores sujeitos a confirmação após análise da planta/briefing.");
    return lines.join("\n");
  }

  document.getElementById("btn-copy").addEventListener("click", function () {
    if (cart.length === 0) {
      showToast("adicione itens ao orçamento primeiro");
      return;
    }
    document.getElementById("modal-text").value = buildQuoteText();
    document.getElementById("modal-overlay").classList.add("open");
  });

  document.getElementById("btn-close-modal").addEventListener("click", function () {
    document.getElementById("modal-overlay").classList.remove("open");
  });
  document.getElementById("modal-overlay").addEventListener("click", function (e) {
    if (e.target === this) this.classList.remove("open");
  });

  document.getElementById("btn-copy-text").addEventListener("click", function () {
    var ta = document.getElementById("modal-text");
    ta.select();
    ta.setSelectionRange(0, 999999);
    navigator.clipboard.writeText(ta.value).then(function () {
      showToast("orçamento copiado!");
    }).catch(function () {
      document.execCommand("copy");
      showToast("orçamento copiado!");
    });
  });

  /* ---------------- toast ---------------- */
  var toastTimer;
  function showToast(msg) {
    var t = document.getElementById("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("show"); }, 2200);
  }

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  /* ---------------- settings panel ---------------- */
  var RATE_FIELD_MAP = {
    "r-vray-1": "vray1", "r-vray-5": "vray5", "r-vray-10": "vray10", "r-vray-15": "vray15",
    "r-ia-1": "ia1", "r-ia-5": "ia5", "r-ia-10": "ia10", "r-ia-15": "ia15",
    "r-mdl-1": "mdl1", "r-mdl-2": "mdl2", "r-mdl-3": "mdl3",
    "r-det-itens": "detItens", "r-det-amb": "detAmbientes",
    "r-exe-int": "exeInteriores", "r-exe-arq": "exeArquitetonico"
  };

  function fillRateInputs() {
    Object.keys(RATE_FIELD_MAP).forEach(function (fieldId) {
      document.getElementById(fieldId).value = rates[RATE_FIELD_MAP[fieldId]];
    });
  }

  document.getElementById("settings-toggle").addEventListener("click", function () {
    this.classList.toggle("open");
    document.getElementById("settings-body").classList.toggle("open");
  });

  document.getElementById("btn-save-rates").addEventListener("click", function () {
    Object.keys(RATE_FIELD_MAP).forEach(function (fieldId) {
      var val = parseFloat(document.getElementById(fieldId).value);
      if (!isNaN(val) && val >= 0) rates[RATE_FIELD_MAP[fieldId]] = val;
    });
    saveRates(rates);
    updateAllPreviews();
    showToast("tabela de valores atualizada");
  });

  document.getElementById("btn-reset-rates").addEventListener("click", function () {
    if (!confirm("Restaurar os valores padrão da tabela 2026?")) return;
    rates = Object.assign({}, DEFAULT_RATES);
    saveRates(rates);
    fillRateInputs();
    updateAllPreviews();
    showToast("valores padrão restaurados");
  });

  /* ---------------- init ---------------- */
  fillRateInputs();
  updateAllPreviews();
  renderCart();
})();
