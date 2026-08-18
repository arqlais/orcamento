(function () {
  "use strict";

  var STORAGE_RATES = "lais_precificador_rates_v2";
  var STORAGE_CART = "lais_precificador_cart_v2";
  var STORAGE_CLIENTS = "lais_clientes_v1";
  var WHATSAPP_NUMBER = "5511969288192";

  var DEFAULT_RATES = {
    vrayTiers: [
      { min: 1, price: 80 }, { min: 5, price: 74 }, { min: 10, price: 71 },
      { min: 15, price: 65 }, { min: 25, price: 60 }, { min: 40, price: 55 }
    ],
    iaTiers: [
      { min: 1, price: 50 }, { min: 5, price: 48 }, { min: 10, price: 46 },
      { min: 15, price: 42 }, { min: 25, price: 38 }, { min: 40, price: 35 }
    ],
    mdl1: 12, mdl2: 10, mdl3: 8,
    detItens: 70, detAmbientes: 110,
    exeInteriores: 15, exeArquitetonico: 19
  };

  var DET_PRESETS = {
    itens: ["Marcenaria", "Marmoraria", "Serralheria", "Vidraçaria", "Estofados/Tapeçaria", "Iluminação", "Outro"],
    ambientes: ["Banheiro", "Lavabo", "Cozinha", "Sala", "Quarto", "Área de Serviço", "Outro"]
  };

  var EXE_ITEMS = {
    interiores: [
      { id: "layout", label: "Planta de layout + cotas", pct: 15 },
      { id: "demolicao", label: "Planta de demolição e construção", pct: 12 },
      { id: "piso", label: "Planta de piso (revestimentos e juntas)", pct: 10 },
      { id: "forro", label: "Planta de forro (gesso, sanca, iluminação)", pct: 12 },
      { id: "eletrica", label: "Planta elétrica (pontos de luz e tomadas)", pct: 12 },
      { id: "hidraulica", label: "Planta hidráulica (água e esgoto)", pct: 12 },
      { id: "elevacoes", label: "Elevações técnicas de todos os ambientes", pct: 15 },
      { id: "marcenaria", label: "Detalhamento de marcenaria + memorial descritivo", pct: 12 }
    ],
    arquitetonico: [
      { id: "plantas", label: "Plantas baixas cotadas (todos os pavimentos)", pct: 20 },
      { id: "cortes", label: "Cortes longitudinal e transversal", pct: 12 },
      { id: "fachadas", label: "Fachadas (frontal, fundos, laterais)", pct: 15 },
      { id: "cobertura", label: "Planta de cobertura", pct: 10 },
      { id: "implantacao", label: "Planta de implantação + topografia", pct: 10 },
      { id: "detalhes", label: "Detalhes construtivos (escadas, janelas, estrutura)", pct: 15 },
      { id: "esquadrias", label: "Quadro de esquadrias + memorial descritivo", pct: 18 }
    ]
  };

  var SCOPE_RENDER = ["Imagem interna ou externa em alta resolução", "Ajuste na modelagem existente", "Pós-produção da imagem", "01 revisão sem custo extra"];
  var SCOPE_MODELAGEM = ["Modelagem via SketchUp 2025", "Volumetria, mobiliário e marcenaria", "Louças e elementos arquitetônicos", "Texturas, iluminação e render (opcionais, sob consulta)"];
  var SCOPE_DET_ITENS = ["Planta e elevações de cada peça cotadas", "Cortes e detalhes importantes", "Especificação de materiais, puxadores e ferragens", "Detalhes de iluminação embutida (quando aplicável)", "Legenda e tabela de peças", "Arquivo em PDF + DWG (AutoCAD)"];
  var SCOPE_DET_AMBIENTES = ["Planta baixa cotada do ambiente", "Elevações de todas as paredes (A, B, C, D)", "Indicação de revestimentos com especificações", "Posicionamento de louças, torneiras e acessórios", "Pontos elétricos, interruptores e pontos de água", "Arquivo em PDF + DWG (AutoCAD)"];

  function loadRates() {
    try {
      var raw = localStorage.getItem(STORAGE_RATES);
      if (!raw) return JSON.parse(JSON.stringify(DEFAULT_RATES));
      var parsed = JSON.parse(raw);
      var merged = Object.assign({}, DEFAULT_RATES, parsed);
      if (!Array.isArray(merged.vrayTiers) || !merged.vrayTiers.length) merged.vrayTiers = DEFAULT_RATES.vrayTiers;
      if (!Array.isArray(merged.iaTiers) || !merged.iaTiers.length) merged.iaTiers = DEFAULT_RATES.iaTiers;
      return merged;
    } catch (e) {
      return JSON.parse(JSON.stringify(DEFAULT_RATES));
    }
  }
  function saveRates(r) { localStorage.setItem(STORAGE_RATES, JSON.stringify(r)); }

  function loadCart() {
    try { var raw = localStorage.getItem(STORAGE_CART); return raw ? JSON.parse(raw) : []; }
    catch (e) { return []; }
  }
  function saveCart(c) { localStorage.setItem(STORAGE_CART, JSON.stringify(c)); }

  function loadClients() {
    try { var raw = localStorage.getItem(STORAGE_CLIENTS); return raw ? JSON.parse(raw) : []; }
    catch (e) { return []; }
  }
  function saveClients(list) { localStorage.setItem(STORAGE_CLIENTS, JSON.stringify(list)); }

  var rates = loadRates();
  var cart = loadCart();

  function fmtBRL(n) {
    n = Math.round((n + Number.EPSILON) * 100) / 100;
    return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  function sortTiers(tiers) {
    return tiers.slice().sort(function (a, b) { return a.min - b.min; });
  }

  function rateForQty(tiers, qty) {
    var sorted = sortTiers(tiers);
    var rate = sorted[0].price;
    for (var i = 0; i < sorted.length; i++) {
      if (qty >= sorted[i].min) rate = sorted[i].price;
    }
    return rate;
  }

  /* ---------------- calculators per service ---------------- */

  function calcVray() {
    var qtd = Math.max(1, parseInt(document.getElementById("vray-qtd").value, 10) || 1);
    var rate = rateForQty(rates.vrayTiers, qtd);
    var total = qtd * rate;
    return {
      total: total,
      rateLabel: fmtBRL(rate) + " / imagem",
      title: "Renderização VRay",
      desc: qtd + (qtd > 1 ? " imagens" : " imagem") + " · " + fmtBRL(rate) + "/img",
      scopeList: [qtd + (qtd > 1 ? " imagens renderizadas em VRay" : " imagem renderizada em VRay")].concat(SCOPE_RENDER)
    };
  }

  function calcIa() {
    var qtd = Math.max(1, parseInt(document.getElementById("ia-qtd").value, 10) || 1);
    var rate = rateForQty(rates.iaTiers, qtd);
    var total = qtd * rate;
    return {
      total: total,
      rateLabel: fmtBRL(rate) + " / imagem",
      title: "Renderização por IA",
      desc: qtd + (qtd > 1 ? " imagens" : " imagem") + " · " + fmtBRL(rate) + "/img",
      scopeList: [qtd + (qtd > 1 ? " imagens renderizadas por IA" : " imagem renderizada por IA")].concat(SCOPE_RENDER)
    };
  }

  function mdlTierRate(area) {
    if (area > 120) return rates.mdl3;
    if (area >= 51) return rates.mdl2;
    return rates.mdl1;
  }

  function calcModelagem() {
    var area = Math.max(1, parseFloat(document.getElementById("mdl-area").value) || 1);
    var rate = mdlTierRate(area);
    var total = area * rate;
    return {
      total: total,
      rateLabel: fmtBRL(rate) + " / m²",
      title: "Modelagem 3D",
      desc: area + " m² · " + fmtBRL(rate) + "/m²",
      scopeList: [area + " m² de área modelada"].concat(SCOPE_MODELAGEM)
    };
  }

  var detModalidade = "itens";
  var detPreset = DET_PRESETS.itens[0];

  function populateDetPresets() {
    var sel = document.getElementById("det-preset");
    var opts = DET_PRESETS[detModalidade];
    sel.innerHTML = opts.map(function (o) { return '<option value="' + o + '">' + o + "</option>"; }).join("");
    detPreset = opts[0];
    sel.value = detPreset;
    document.getElementById("det-outro-wrap").style.display = detPreset === "Outro" ? "block" : "none";
  }

  function calcDetalhamento() {
    var qtd = Math.max(1, parseInt(document.getElementById("det-qtd").value, 10) || 1);
    var isItens = detModalidade === "itens";
    var rate = isItens ? rates.detItens : rates.detAmbientes;
    var total = qtd * rate;
    var unidade = isItens ? "peça" : "ambiente";
    var tipoLabel = detPreset === "Outro" ? (document.getElementById("det-outro").value.trim() || "Outro") : detPreset;
    var baseScope = isItens ? SCOPE_DET_ITENS : SCOPE_DET_AMBIENTES;
    return {
      total: total,
      rateLabel: fmtBRL(rate) + " / " + unidade,
      title: "Detalhamento — " + tipoLabel + " (" + (isItens ? "Itens" : "Ambientes") + ")",
      desc: qtd + " " + unidade + (qtd > 1 ? "s" : "") + " · " + fmtBRL(rate) + "/" + unidade,
      scopeList: [qtd + " " + unidade + (qtd > 1 ? "s" : "") + " — " + tipoLabel].concat(baseScope)
    };
  }

  var exeModalidade = "interiores";
  var exeChecked = {
    interiores: buildDefaultChecked("interiores"),
    arquitetonico: buildDefaultChecked("arquitetonico")
  };
  function buildDefaultChecked(mod) {
    var set = {};
    EXE_ITEMS[mod].forEach(function (it) { set[it.id] = true; });
    return set;
  }

  function renderExeChecklist() {
    var box = document.getElementById("exe-checklist");
    var items = EXE_ITEMS[exeModalidade];
    var checked = exeChecked[exeModalidade];
    box.innerHTML = items.map(function (it) {
      var isChecked = checked[it.id] !== false;
      return '<label class="check-item"><input type="checkbox" data-exe-id="' + it.id + '"' + (isChecked ? " checked" : "") + '>' +
        '<span class="ci-label">' + it.label + '</span><span class="ci-pct">' + it.pct + '%</span></label>';
    }).join("");
  }

  function exePctSelected() {
    var items = EXE_ITEMS[exeModalidade];
    var checked = exeChecked[exeModalidade];
    var pct = 0;
    items.forEach(function (it) { if (checked[it.id] !== false) pct += it.pct; });
    return pct;
  }

  function calcExecutivo() {
    var area = Math.max(1, parseFloat(document.getElementById("exe-area").value) || 1);
    var ajuste = parseFloat(document.getElementById("exe-ajuste").value) || 0;
    var isInteriores = exeModalidade === "interiores";
    var rate = isInteriores ? rates.exeInteriores : rates.exeArquitetonico;
    var pct = exePctSelected();
    var base = area * rate * (pct / 100);
    var total = base * (1 + ajuste / 100);
    var ajusteTxt = ajuste !== 0 ? " · ajuste " + (ajuste > 0 ? "+" : "") + ajuste + "%" : "";
    var pctTxt = pct < 100 ? " · escopo " + pct + "%" : "";
    var checkedLabels = EXE_ITEMS[exeModalidade].filter(function (it) { return exeChecked[exeModalidade][it.id] !== false; }).map(function (it) { return it.label; });
    return {
      total: total,
      rateLabel: fmtBRL(rate) + " / m²" + pctTxt + ajusteTxt,
      title: "Projeto Executivo — " + (isInteriores ? "Interiores" : "Arquitetônico"),
      desc: area + " m² · " + fmtBRL(rate) + "/m²" + pctTxt + ajusteTxt,
      scopeList: checkedLabels.length ? checkedLabels : ["Escopo a definir"]
    };
  }

  function calcCustom() {
    var titulo = document.getElementById("custom-titulo").value.trim() || "Serviço personalizado";
    var escopoRaw = document.getElementById("custom-escopo").value;
    var scopeList = escopoRaw.split("\n").map(function (s) { return s.trim(); }).filter(Boolean);
    var valor = Math.max(0, parseFloat(document.getElementById("custom-valor").value) || 0);
    return {
      total: valor,
      rateLabel: "valor fechado",
      title: titulo,
      desc: scopeList.length + " item" + (scopeList.length === 1 ? "" : "s") + " de escopo",
      scopeList: scopeList.length ? scopeList : ["A combinar"]
    };
  }

  var CALCULATORS = {
    vray: calcVray, ia: calcIa, modelagem: calcModelagem,
    detalhamento: calcDetalhamento, executivo: calcExecutivo, custom: calcCustom
  };
  var PREVIEW_ID = { vray: "vray-preview", ia: "ia-preview", modelagem: "mdl-preview", detalhamento: "det-preview", executivo: "exe-preview", custom: "custom-preview" };

  var currentTab = "vray";

  function updatePreview(key) {
    var result = CALCULATORS[key]();
    var box = document.getElementById(PREVIEW_ID[key]);
    if (!box) return;
    box.querySelector(".val").textContent = fmtBRL(result.total);
    box.querySelector(".rate").textContent = result.rateLabel;
    if (key === "executivo") document.getElementById("exe-checklist-pct").textContent = exePctSelected() + "%";
  }
  function updateAllPreviews() { Object.keys(CALCULATORS).forEach(updatePreview); }

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
    populateDetPresets();
    updatePreview("detalhamento");
  });

  document.getElementById("exe-modalidade").addEventListener("click", function (e) {
    var chip = e.target.closest(".chip");
    if (!chip) return;
    exeModalidade = chip.dataset.val;
    this.querySelectorAll(".chip").forEach(function (c) { c.classList.toggle("active", c === chip); });
    renderExeChecklist();
    updatePreview("executivo");
  });

  document.getElementById("exe-checklist").addEventListener("change", function (e) {
    var input = e.target.closest("[data-exe-id]");
    if (!input) return;
    exeChecked[exeModalidade][input.dataset.exeId] = input.checked;
    updatePreview("executivo");
  });

  document.getElementById("det-preset").addEventListener("change", function () {
    detPreset = this.value;
    document.getElementById("det-outro-wrap").style.display = detPreset === "Outro" ? "block" : "none";
    updatePreview("detalhamento");
  });

  /* ---------------- live inputs ---------------- */
  ["vray-qtd", "ia-qtd", "mdl-area", "det-qtd", "det-outro", "exe-area", "exe-ajuste", "custom-titulo", "custom-escopo", "custom-valor"].forEach(function (id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("input", function () {
      var key = id.indexOf("vray") === 0 ? "vray" : id.indexOf("ia") === 0 ? "ia" : id.indexOf("mdl") === 0 ? "modelagem" : id.indexOf("det") === 0 ? "detalhamento" : id.indexOf("exe") === 0 ? "executivo" : "custom";
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
      scopeList: result.scopeList,
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

  function subtotal() { return cart.reduce(function (sum, item) { return sum + item.total; }, 0); }

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

    document.getElementById("btn-close-client").disabled = !hasItems;
  }

  document.getElementById("global-adjust").addEventListener("input", updateTotals);

  document.getElementById("btn-clear").addEventListener("click", function () {
    if (cart.length === 0) return;
    if (!confirm("Limpar todos os itens do orçamento?")) return;
    cart = [];
    saveCart(cart);
    renderCart();
  });

  /* ---------------- quote text (formato emoji, pronto pra whatsapp) ---------------- */
  function buildQuoteText() {
    if (cart.length === 0) return "";
    var pct = parseFloat(document.getElementById("global-adjust").value) || 0;
    var sub = subtotal();
    var total = sub * (1 + pct / 100);
    var lines = [];
    cart.forEach(function (item) {
      lines.push("✨ proposta — " + item.title);
      lines.push("");
      lines.push("📄 serviço:");
      lines.push("");
      item.scopeList.forEach(function (s) { lines.push("* " + s); });
      lines.push("");
      lines.push("💰 valor:");
      lines.push(fmtBRL(item.total));
      lines.push("");
      lines.push("──────────");
      lines.push("");
    });
    if (cart.length > 1 || pct !== 0) {
      lines.push("💰 valor total do orçamento:");
      if (pct !== 0) lines.push("subtotal " + fmtBRL(sub) + " · ajuste " + (pct > 0 ? "+" : "") + pct + "%");
      lines.push(fmtBRL(total));
      lines.push("");
    }
    lines.push("Valores sujeitos a confirmação após análise da planta/briefing.");
    return lines.join("\n");
  }

  document.getElementById("btn-copy").addEventListener("click", function () {
    if (cart.length === 0) { showToast("adicione itens ao orçamento primeiro"); return; }
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
    navigator.clipboard.writeText(ta.value).then(function () { showToast("orçamento copiado!"); })
      .catch(function () { document.execCommand("copy"); showToast("orçamento copiado!"); });
  });

  /* ---------------- fechar cliente ---------------- */
  document.getElementById("btn-close-client").addEventListener("click", function () {
    if (cart.length === 0) return;
    var sub = subtotal();
    var pct = parseFloat(document.getElementById("global-adjust").value) || 0;
    var total = sub * (1 + pct / 100);
    document.getElementById("cm-nome").value = "";
    document.getElementById("cm-data").value = new Date().toISOString().slice(0, 10);
    document.getElementById("cm-prazo").value = "";
    document.getElementById("cm-valor-proposta").value = Math.round(sub);
    document.getElementById("cm-valor-negociado").value = Math.round(total);
    document.getElementById("cm-escopo").value = cart.map(function (item) {
      return item.title + ": " + item.scopeList.join("; ");
    }).join("\n\n");
    document.getElementById("client-modal-overlay").classList.add("open");
  });
  document.getElementById("btn-close-client-modal").addEventListener("click", function () {
    document.getElementById("client-modal-overlay").classList.remove("open");
  });
  document.getElementById("client-modal-overlay").addEventListener("click", function (e) {
    if (e.target === this) this.classList.remove("open");
  });
  document.getElementById("btn-save-client").addEventListener("click", function () {
    var nome = document.getElementById("cm-nome").value.trim();
    if (!nome) { showToast("informe o nome do cliente"); return; }
    var clients = loadClients();
    clients.push({
      id: Date.now() + Math.random().toString(16).slice(2),
      nome: nome,
      dataFechamento: document.getElementById("cm-data").value,
      prazo: document.getElementById("cm-prazo").value,
      valorProposta: parseFloat(document.getElementById("cm-valor-proposta").value) || 0,
      valorNegociado: parseFloat(document.getElementById("cm-valor-negociado").value) || 0,
      escopo: document.getElementById("cm-escopo").value.trim(),
      pago50: false,
      pagoTotal: false,
      criadoEm: new Date().toISOString()
    });
    saveClients(clients);
    document.getElementById("client-modal-overlay").classList.remove("open");
    showToast("cliente salvo na central!");
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

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  /* ---------------- settings panel ---------------- */
  var RATE_FIELD_MAP = {
    "r-mdl-1": "mdl1", "r-mdl-2": "mdl2", "r-mdl-3": "mdl3",
    "r-det-itens": "detItens", "r-det-amb": "detAmbientes",
    "r-exe-int": "exeInteriores", "r-exe-arq": "exeArquitetonico"
  };

  function fillRateInputs() {
    Object.keys(RATE_FIELD_MAP).forEach(function (fieldId) {
      document.getElementById(fieldId).value = rates[RATE_FIELD_MAP[fieldId]];
    });
    renderTierEditor("vray");
    renderTierEditor("ia");
  }

  function renderTierEditor(key) {
    var box = document.getElementById("tier-" + key);
    var tiers = sortTiers(rates[key + "Tiers"]);
    box.innerHTML = tiers.map(function (t, i) {
      return '<div class="tier-row" data-idx="' + i + '">' +
        '<input type="number" class="tier-min" value="' + t.min + '" min="1" placeholder="a partir de (un)">' +
        '<input type="number" class="tier-price" value="' + t.price + '" min="0" placeholder="R$/imagem">' +
        '<button type="button" class="tier-remove" data-remove-tier="' + i + '">✕</button></div>';
    }).join("");
  }

  document.getElementById("settings-toggle").addEventListener("click", function () {
    this.classList.toggle("open");
    document.getElementById("settings-body").classList.toggle("open");
  });

  document.querySelectorAll("[data-add-tier]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var key = this.dataset.addTier;
      var tiers = sortTiers(rates[key + "Tiers"]);
      var last = tiers[tiers.length - 1];
      tiers.push({ min: last.min + 10, price: Math.max(0, last.price - 5) });
      rates[key + "Tiers"] = tiers;
      renderTierEditor(key);
    });
  });

  document.getElementById("tier-vray").addEventListener("click", handleTierRemove);
  document.getElementById("tier-ia").addEventListener("click", handleTierRemove);
  function handleTierRemove(e) {
    var btn = e.target.closest("[data-remove-tier]");
    if (!btn) return;
    var key = this.id === "tier-vray" ? "vray" : "ia";
    var idx = parseInt(btn.dataset.removeTier, 10);
    var tiers = sortTiers(rates[key + "Tiers"]);
    if (tiers.length <= 1) { showToast("mantenha pelo menos uma faixa"); return; }
    tiers.splice(idx, 1);
    rates[key + "Tiers"] = tiers;
    renderTierEditor(key);
  }

  function readTierEditor(key) {
    var box = document.getElementById("tier-" + key);
    var rows = box.querySelectorAll(".tier-row");
    var tiers = [];
    rows.forEach(function (row) {
      var min = parseFloat(row.querySelector(".tier-min").value);
      var price = parseFloat(row.querySelector(".tier-price").value);
      if (!isNaN(min) && !isNaN(price) && min > 0 && price >= 0) tiers.push({ min: min, price: price });
    });
    return tiers.length ? sortTiers(tiers) : rates[key + "Tiers"];
  }

  document.getElementById("btn-save-rates").addEventListener("click", function () {
    Object.keys(RATE_FIELD_MAP).forEach(function (fieldId) {
      var val = parseFloat(document.getElementById(fieldId).value);
      if (!isNaN(val) && val >= 0) rates[RATE_FIELD_MAP[fieldId]] = val;
    });
    rates.vrayTiers = readTierEditor("vray");
    rates.iaTiers = readTierEditor("ia");
    saveRates(rates);
    renderTierEditor("vray");
    renderTierEditor("ia");
    updateAllPreviews();
    showToast("tabela de valores atualizada");
  });

  document.getElementById("btn-reset-rates").addEventListener("click", function () {
    if (!confirm("Restaurar os valores padrão da tabela 2026?")) return;
    rates = JSON.parse(JSON.stringify(DEFAULT_RATES));
    saveRates(rates);
    fillRateInputs();
    updateAllPreviews();
    showToast("valores padrão restaurados");
  });

  /* ---------------- init ---------------- */
  populateDetPresets();
  renderExeChecklist();
  fillRateInputs();
  updateAllPreviews();
  renderCart();
})();
