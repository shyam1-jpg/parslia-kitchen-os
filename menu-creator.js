(function () {
  "use strict";

  var MEAL_LABELS = {
    breakfast: "Breakfast",
    brunch: "Brunch",
    lunch: "Lunch",
    dinner: "Dinner"
  };

  var SAMPLE_DISHES = [{"name": "Aam Papad Challi", "course": "Snacks and Starters", "meals": ["brunch", "lunch"]}, {"name": "Almond Milk Smoothie", "course": "Beverages", "meals": ["breakfast", "brunch"]}, {"name": "Almond Phirni", "course": "Mithais", "meals": ["dinner", "brunch"]}, {"name": "Aloo Masala Cheese Toast", "course": "Snacks and Starters", "meals": ["breakfast", "brunch", "lunch"]}, {"name": "Aloo Muri", "course": "Snacks and Starters", "meals": ["brunch", "lunch"]}, {"name": "Anjeer and Boondi Pancakes", "course": "Snacks and Starters", "meals": ["breakfast", "brunch", "lunch"]}, {"name": "Anjeer aur Khajur Milkshake", "course": "Beverages", "meals": ["breakfast", "brunch"]}, {"name": "Anjeer Toffee", "course": "Mithais", "meals": ["dinner", "brunch"]}, {"name": "Arugula and Apple Salad", "course": "Salads", "meals": ["lunch", "dinner", "brunch"]}, {"name": "Avocado Toast", "course": "Snacks and Starters", "meals": ["breakfast", "brunch", "lunch"]}, {"name": "Babycorn Paneer Drumsticks", "course": "Snacks and Starters", "meals": ["brunch", "lunch"]}, {"name": "Bajra Risotto", "course": "Main", "meals": ["lunch", "dinner"]}, {"name": "Baked Chocolate Apple", "course": "Desserts", "meals": ["dinner", "brunch"]}, {"name": "Banana Bread", "course": "Snacks and Starters", "meals": ["breakfast", "brunch", "lunch"]}, {"name": "Banana Walnut Chocolate Ice Cream", "course": "Desserts", "meals": ["dinner", "brunch"]}, {"name": "Barley Risotto", "course": "Main", "meals": ["lunch", "dinner"]}, {"name": "Batata Puri", "course": "Breads", "meals": ["lunch", "dinner"]}, {"name": "Bathue ka Parantha", "course": "Breads", "meals": ["lunch", "dinner"]}, {"name": "Beetroot Browines", "course": "Desserts", "meals": ["dinner", "brunch"]}, {"name": "Beetroot Coconut Barfi", "course": "Mithais", "meals": ["dinner", "brunch"]}, {"name": "Beetroot Quinoa Pachadi", "course": "Accompaniments", "meals": ["lunch", "dinner"]}, {"name": "Bhakri Pizza", "course": "Snacks and Starters", "meals": ["brunch", "lunch"]}, {"name": "Bhakri with Thecha", "course": "Breads", "meals": ["lunch", "dinner"]}, {"name": "Bhindi Hara Masala", "course": "Main", "meals": ["lunch", "dinner"]}, {"name": "Bhindi Methi Bhurjee", "course": "Main", "meals": ["lunch", "dinner"]}, {"name": "Biscuit Ice Cream Chocolate Bars", "course": "Desserts", "meals": ["dinner", "brunch"]}, {"name": "Black Grapes Shikanji", "course": "Beverages", "meals": ["breakfast", "brunch"]}, {"name": "Broccoli & Cheese Soup", "course": "Soups", "meals": ["lunch", "dinner"]}, {"name": "Broccoli Mac and Cheese", "course": "Main", "meals": ["lunch", "dinner"]}, {"name": "Burnt Garlic Vegetable Fried Rice", "course": "Rice", "meals": ["lunch", "dinner"]}, {"name": "Caramel Walnut Fudge", "course": "Desserts", "meals": ["dinner", "brunch"]}, {"name": "Cashew Pesto Pasta", "course": "Noodles and Pastas", "meals": ["lunch", "dinner"]}, {"name": "Chaat Quiche", "course": "Snacks and Starters", "meals": ["brunch", "lunch"]}, {"name": "Chakna Platter", "course": "Snacks and Starters", "meals": ["brunch", "lunch"]}, {"name": "Chana Cheese Roti Turnover", "course": "Snacks and Starters", "meals": ["brunch", "lunch"]}, {"name": "Cheese Kurkure", "course": "Snacks and Starters", "meals": ["brunch", "lunch"]}, {"name": "Cheesy Roesti", "course": "Snacks and Starters", "meals": ["brunch", "lunch"]}, {"name": "Chickoo Walnut Kulfi with Salted Caramel Sauce", "course": "Desserts", "meals": ["dinner", "brunch"]}, {"name": "Chilli Chana Aloo", "course": "Main", "meals": ["lunch", "dinner"]}, {"name": "Chocolate and Cheese Sandwich", "course": "Snacks and Starters", "meals": ["brunch", "lunch"]}, {"name": "Chocolate and Coconut Dim sums", "course": "Desserts", "meals": ["dinner", "brunch"]}, {"name": "Chocolate Bread Bomb", "course": "Desserts", "meals": ["breakfast", "dinner", "brunch"]}, {"name": "Chocolate Diya", "course": "Mithais", "meals": ["dinner", "brunch"]}, {"name": "Chocolate Gulab Jamun", "course": "Mithais", "meals": ["dinner", "brunch"]}, {"name": "Chocolate Nut Bar", "course": "Desserts", "meals": ["dinner", "brunch"]}, {"name": "Chocolate Overnight Muesli", "course": "Snacks and Starters", "meals": ["brunch", "lunch"]}, {"name": "Chocolate Pakode", "course": "Snacks and Starters", "meals": ["brunch", "lunch"]}, {"name": "Chocolate Peanut Chikki", "course": "Mithais", "meals": ["dinner", "brunch"]}];

  var STORAGE_KEY = "parslia-menu-creator-v1";
  var state = {
    name: "Main dining week",
    days: 3,
    startDate: "",
    meals: ["lunch", "dinner"],
    slots: {},
    activeKey: null,
    editIndex: null
  };

  var setupForm = document.getElementById("setupForm");
  var customWrap = document.getElementById("customDaysWrap");
  var customDays = document.getElementById("customDays");
  var startDate = document.getElementById("startDate");
  var setupStatus = document.getElementById("setupStatus");
  var emptyState = document.getElementById("emptyState");
  var boardScroll = document.getElementById("boardScroll");
  var menuBoard = document.getElementById("menuBoard");
  var boardTitle = document.getElementById("boardTitle");
  var boardMeta = document.getElementById("boardMeta");
  var boardEyebrow = document.getElementById("boardEyebrow");
  var boardStats = document.getElementById("boardStats");
  var dialog = document.getElementById("dishDialog");
  var dishForm = document.getElementById("dishForm");
  var dishName = document.getElementById("dishName");
  var dishNotes = document.getElementById("dishNotes");
  var dishSlotLabel = document.getElementById("dishSlotLabel");
  var dishDialogTitle = document.getElementById("dishDialogTitle");
  var dishRemove = document.getElementById("dishRemove");
  var sampleList = document.getElementById("sampleList");
  var dishSearch = document.getElementById("dishSearch");
  var savedList = document.getElementById("savedList");

  function todayISO() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + m + "-" + day;
  }

  if (startDate && !startDate.value) startDate.value = todayISO();

  function selectedDuration() {
    var picked = setupForm.querySelector('input[name="duration"]:checked');
    if (!picked) return 3;
    if (picked.value === "custom") {
      var n = parseInt(customDays.value, 10);
      if (!n || n < 1) n = 1;
      if (n > 14) n = 14;
      return n;
    }
    return parseInt(picked.value, 10);
  }

  function selectedMeals() {
    return Array.prototype.map.call(
      setupForm.querySelectorAll('input[name="meal"]:checked'),
      function (el) { return el.value; }
    );
  }

  function syncCustomVisibility() {
    var picked = setupForm.querySelector('input[name="duration"]:checked');
    var show = picked && picked.value === "custom";
    customWrap.hidden = !show;
  }

  setupForm.querySelectorAll('input[name="duration"]').forEach(function (el) {
    el.addEventListener("change", syncCustomVisibility);
  });
  syncCustomVisibility();

  function addDays(iso, offset) {
    var parts = iso.split("-").map(Number);
    var d = new Date(parts[0], parts[1] - 1, parts[2]);
    d.setDate(d.getDate() + offset);
    return d;
  }

  function formatDate(d) {
    return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  }

  function formatDow(d) {
    return d.toLocaleDateString(undefined, { weekday: "long" });
  }

  function slotKey(dayIndex, meal) {
    return dayIndex + ":" + meal;
  }

  function countDishes() {
    var total = 0;
    Object.keys(state.slots).forEach(function (k) {
      total += (state.slots[k] || []).length;
    });
    return total;
  }

  function setStatus(msg, isErr) {
    setupStatus.textContent = msg || "";
    setupStatus.className = "status" + (isErr ? " err" : "");
  }

  function dishesPerMealCount() {
    var el = document.getElementById("dishesPerMeal");
    var n = el ? parseInt(el.value, 10) : 3;
    if (!n || n < 1) n = 1;
    if (n > 6) n = 6;
    return n;
  }

  function shuffle(list) {
    var arr = list.slice();
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  function poolForMeal(meal) {
    var preferred = SAMPLE_DISHES.filter(function (d) {
      return d.meals && d.meals.indexOf(meal) !== -1;
    });
    if (preferred.length >= 4) return preferred;
    return SAMPLE_DISHES.slice();
  }

  function pickDishes(meal, count, usedNames) {
    var pool = shuffle(poolForMeal(meal));
    var picked = [];
    var i;

    for (i = 0; i < pool.length && picked.length < count; i++) {
      if (usedNames[pool[i].name]) continue;
      picked.push(pool[i]);
      usedNames[pool[i].name] = true;
    }

    // If we ran out of unique dishes, allow reuse from a reshuffled pool
    if (picked.length < count) {
      pool = shuffle(poolForMeal(meal));
      for (i = 0; i < pool.length && picked.length < count; i++) {
        var already = picked.some(function (p) { return p.name === pool[i].name; });
        if (already) continue;
        picked.push(pool[i]);
      }
    }

    // Absolute fallback: still fill with something
    while (picked.length < count && SAMPLE_DISHES.length) {
      picked.push(SAMPLE_DISHES[picked.length % SAMPLE_DISHES.length]);
    }

    return picked.map(function (d) {
      return { name: d.name, notes: d.course || "" };
    });
  }

  function applySetupToState() {
    var name = document.getElementById("menuName").value.trim() || "Untitled menu";
    var days = selectedDuration();
    var meals = selectedMeals();
    var start = startDate.value || todayISO();

    if (!meals.length) {
      setStatus("Select at least one meal service (breakfast, brunch, lunch or dinner).", true);
      return false;
    }

    state.name = name;
    state.days = days;
    state.startDate = start;
    state.meals = meals;
    return true;
  }

  function buildBoard(preserveSlots, fillGenerated) {
    if (!applySetupToState()) return false;

    var oldSlots = preserveSlots ? state.slots : {};
    var usedNames = {};
    var perMeal = dishesPerMealCount();
    state.slots = {};

    for (var d = 0; d < state.days; d++) {
      state.meals.forEach(function (meal) {
        var key = slotKey(d, meal);
        if (fillGenerated) {
          state.slots[key] = pickDishes(meal, perMeal, usedNames);
        } else {
          state.slots[key] = (oldSlots[key] || []).slice();
        }
      });
    }

    renderBoard();
    if (fillGenerated) {
      setStatus(
        "Menu generated — " +
          state.days + " day" + (state.days === 1 ? "" : "s") + ", " +
          state.meals.length + " service" + (state.meals.length === 1 ? "" : "s") + ", " +
          countDishes() + " dishes. Edit any dish to change it."
      );
    } else {
      setStatus(
        "Empty board ready — " +
          state.days + " day" + (state.days === 1 ? "" : "s") + ", " +
          state.meals.length + " service" + (state.meals.length === 1 ? "" : "s") +
          ". Add dishes or press Generate menu."
      );
    }
    return true;
  }

  function generateMenu() {
    return buildBoard(false, true);
  }

  function renderBoard() {
    emptyState.hidden = true;
    boardScroll.hidden = false;
    boardStats.hidden = false;
    boardEyebrow.textContent = "Live board";
    boardTitle.textContent = state.name;
    var end = addDays(state.startDate, state.days - 1);
    boardMeta.textContent =
      formatDate(addDays(state.startDate, 0)) +
      (state.days > 1 ? " → " + formatDate(end) : "") +
      " · " +
      state.meals.map(function (m) { return MEAL_LABELS[m]; }).join(", ");

    document.getElementById("statDays").textContent = String(state.days);
    document.getElementById("statMeals").textContent = String(state.meals.length);
    document.getElementById("statDishes").textContent = String(countDishes());

    menuBoard.innerHTML = "";
    menuBoard.style.gridTemplateColumns = "repeat(" + state.days + ", minmax(200px, 1fr))";

    for (var d = 0; d < state.days; d++) {
      var dateObj = addDays(state.startDate, d);
      var col = document.createElement("article");
      col.className = "day-col";
      col.setAttribute("role", "row");

      var head = document.createElement("div");
      head.className = "day-head";
      head.innerHTML =
        '<div class="dow">Day ' + (d + 1) + " · " + formatDow(dateObj) + "</div>" +
        '<div class="date">' + formatDate(dateObj) + "</div>";
      col.appendChild(head);

      state.meals.forEach(function (meal) {
        var key = slotKey(d, meal);
        var slot = document.createElement("div");
        slot.className = "meal-slot";
        slot.dataset.key = key;

        var label = document.createElement("div");
        label.className = "meal-label";
        label.textContent = MEAL_LABELS[meal];
        slot.appendChild(label);

        var list = document.createElement("ul");
        list.className = "dish-list";
        (state.slots[key] || []).forEach(function (dish, idx) {
          var li = document.createElement("li");
          var btn = document.createElement("button");
          btn.type = "button";
          btn.className = "dish-item";
          btn.innerHTML = "<strong></strong>" + (dish.notes ? "<em></em>" : "");
          btn.querySelector("strong").textContent = dish.name;
          if (dish.notes) btn.querySelector("em").textContent = dish.notes;
          btn.addEventListener("click", function () { openDishDialog(key, idx); });
          li.appendChild(btn);
          list.appendChild(li);
        });
        slot.appendChild(list);

        var add = document.createElement("button");
        add.type = "button";
        add.className = "add-dish";
        add.textContent = "+ Add dish";
        add.addEventListener("click", function () { openDishDialog(key, null); });
        slot.appendChild(add);

        col.appendChild(slot);
      });

      menuBoard.appendChild(col);
    }
  }

  function openDishDialog(key, editIndex) {
    state.activeKey = key;
    state.editIndex = editIndex;
    var parts = key.split(":");
    var dayIndex = parseInt(parts[0], 10);
    var meal = parts[1];
    var dateObj = addDays(state.startDate, dayIndex);

    dishSlotLabel.textContent = formatDow(dateObj) + " · " + MEAL_LABELS[meal];
    dishDialogTitle.textContent = editIndex == null ? "Add dish" : "Edit dish";
    dishRemove.hidden = editIndex == null;
    document.getElementById("dishSave").textContent = editIndex == null ? "Add to menu" : "Save changes";

    if (editIndex != null) {
      var dish = state.slots[key][editIndex];
      dishName.value = dish.name;
      dishNotes.value = dish.notes || "";
    } else {
      dishName.value = "";
      dishNotes.value = "";
    }
    dishSearch.value = "";
    renderSamples(meal, "");
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
    setTimeout(function () { dishName.focus(); }, 30);
  }

  function closeDialog() {
    if (typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
  }

  function renderSamples(meal, query) {
    var q = (query || "").trim().toLowerCase();
    sampleList.innerHTML = "";
    var filtered = SAMPLE_DISHES.filter(function (d) {
      if (!q) return true;
      return d.name.toLowerCase().indexOf(q) !== -1 || (d.course || "").toLowerCase().indexOf(q) !== -1;
    });

    // Prefer meal-matched samples first when browsing a specific service
    if (!q && meal) {
      filtered.sort(function (a, b) {
        var am = a.meals && a.meals.indexOf(meal) !== -1 ? 0 : 1;
        var bm = b.meals && b.meals.indexOf(meal) !== -1 ? 0 : 1;
        return am - bm || a.name.localeCompare(b.name);
      });
    } else {
      filtered.sort(function (a, b) { return a.name.localeCompare(b.name); });
    }

    filtered.slice(0, 40).forEach(function (d) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "sample-btn";
      btn.setAttribute("role", "option");
      btn.innerHTML = "<span></span><small></small>";
      btn.querySelector("span").textContent = d.name;
      btn.querySelector("small").textContent = d.course || "";
      btn.addEventListener("click", function () {
        dishName.value = d.name;
        dishName.focus();
      });
      sampleList.appendChild(btn);
    });

    if (!filtered.length) {
      var empty = document.createElement("p");
      empty.className = "hint";
      empty.textContent = "No sample matches — type your own dish name above.";
      sampleList.appendChild(empty);
    }
  }

  dishSearch.addEventListener("input", function () {
    var meal = state.activeKey ? state.activeKey.split(":")[1] : null;
    renderSamples(meal, dishSearch.value);
  });

  dishForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var name = dishName.value.trim();
    if (!name || !state.activeKey) return;
    var notes = dishNotes.value.trim();
    var list = state.slots[state.activeKey] || (state.slots[state.activeKey] = []);
    var payload = { name: name, notes: notes };
    if (state.editIndex != null) list[state.editIndex] = payload;
    else list.push(payload);
    closeDialog();
    renderBoard();
  });

  document.getElementById("dishCancel").addEventListener("click", closeDialog);
  document.getElementById("dishClose").addEventListener("click", closeDialog);
  dishRemove.addEventListener("click", function () {
    if (state.activeKey == null || state.editIndex == null) return;
    state.slots[state.activeKey].splice(state.editIndex, 1);
    closeDialog();
    renderBoard();
  });

  setupForm.addEventListener("submit", function (e) {
    e.preventDefault();
    generateMenu();
  });

  var btnEmptyBoard = document.getElementById("btnEmptyBoard");
  if (btnEmptyBoard) {
    btnEmptyBoard.addEventListener("click", function () {
      buildBoard(false, false);
    });
  }

  var btnGenerateEmpty = document.getElementById("btnGenerateEmpty");
  if (btnGenerateEmpty) {
    btnGenerateEmpty.addEventListener("click", function () {
      generateMenu();
    });
  }

  document.getElementById("btnClear").addEventListener("click", function () {
    if (boardScroll.hidden || !Object.keys(state.slots).length) {
      setStatus("Generate a menu first, then you can clear dishes.", true);
      return;
    }
    Object.keys(state.slots).forEach(function (k) { state.slots[k] = []; });
    renderBoard();
    setStatus("All dishes cleared. Press Generate menu to refill.");
  });

  function loadStore() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch (err) {
      return [];
    }
  }

  function writeStore(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  function renderSaved() {
    var items = loadStore();
    savedList.innerHTML = "";
    if (!items.length) {
      var p = document.createElement("p");
      p.className = "saved-empty";
      p.textContent = "No saved menus yet.";
      savedList.appendChild(p);
      return;
    }
    items.forEach(function (item) {
      var li = document.createElement("li");
      var openBtn = document.createElement("button");
      openBtn.type = "button";
      openBtn.textContent = item.name + " · " + item.days + "d";
      openBtn.title = "Load this menu";
      openBtn.addEventListener("click", function () { loadMenu(item); });
      var del = document.createElement("button");
      del.type = "button";
      del.className = "del";
      del.textContent = "Delete";
      del.addEventListener("click", function () {
        writeStore(loadStore().filter(function (x) { return x.id !== item.id; }));
        renderSaved();
      });
      li.appendChild(openBtn);
      li.appendChild(del);
      savedList.appendChild(li);
    });
  }

  function applySetupControls() {
    document.getElementById("menuName").value = state.name;
    startDate.value = state.startDate || todayISO();
    var durationInputs = setupForm.querySelectorAll('input[name="duration"]');
    var matched = false;
    durationInputs.forEach(function (el) {
      if (el.value !== "custom" && parseInt(el.value, 10) === state.days) {
        el.checked = true;
        matched = true;
      }
    });
    if (!matched) {
      setupForm.querySelector('input[name="duration"][value="custom"]').checked = true;
      customDays.value = String(state.days);
    }
    syncCustomVisibility();
    setupForm.querySelectorAll('input[name="meal"]').forEach(function (el) {
      el.checked = state.meals.indexOf(el.value) !== -1;
    });
  }

  function loadMenu(item) {
    state.name = item.name;
    state.days = item.days;
    state.startDate = item.startDate;
    state.meals = item.meals.slice();
    state.slots = JSON.parse(JSON.stringify(item.slots || {}));
    applySetupControls();
    renderBoard();
    setStatus("Loaded “" + item.name + "”.");
  }

  document.getElementById("btnSave").addEventListener("click", function () {
    if (boardScroll.hidden) {
      setStatus("Generate a menu before saving.", true);
      return;
    }
    var items = loadStore();
    var payload = {
      id: "m-" + Date.now(),
      name: state.name,
      days: state.days,
      startDate: state.startDate,
      meals: state.meals.slice(),
      slots: JSON.parse(JSON.stringify(state.slots)),
      savedAt: new Date().toISOString()
    };
    items.unshift(payload);
    writeStore(items.slice(0, 20));
    renderSaved();
    setStatus("Saved “" + state.name + "” in this browser.");
  });

  document.getElementById("btnPrint").addEventListener("click", function () {
    if (boardScroll.hidden) {
      setStatus("Generate a menu before printing.", true);
      return;
    }
    window.print();
  });

  renderSaved();
})();
