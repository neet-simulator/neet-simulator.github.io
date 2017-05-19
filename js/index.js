/**NEET Simulator
Copyright (C) 2017  Maester NEET

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.**/

var keyModifiers = {
  "d": 10,
  "c": 100,
  "k": 1000,
  "m": 1000000,
  "g": 1000000000,
  "t": 1000000000000
}

var curKeys = [];
var intervals = {};
var stats = {};
var settings = {};
var stores = {};
var items = {};
var images = {};
var anims = {
  burn: {
    value: false,
    duration: 1000,
    end: 0
  }
}

function loadVar(name, callback){
	$.getJSON('data/'+name+'.json', function(value){
		window[name] = value;
    console.log("Done loading "+name+".json");
		callback();
	});
}
function loadVars(callback){
  console.log("Loading variables...");
	var vars = ["items", "stats", "stores", "images", "settings"];
	var vars_left = vars.length;
	for(var i=0;i<vars.length;i++){
		loadVar(vars[i], function(){
			vars_left--;
			if(vars_left == 0){
        console.log("Done loading variables");
        initGame();
				setGameMode(function(){
          console.log("Done initializing game.");
					callback();
				});
			}
		});
	}
}
function setGameMode(callback, game_mode=null){
	if(game_mode){
		stats.game_mode = game_mode;
	}
  console.log("Setting game mode...");
  $.getJSON('data/game_mode/'+stats.game_mode+'.json', function(value){
    stats.alive = true;
    for(var name in value.stats){
			stats[name].value = value.stats[name];
		}

    //images are the largest files to load, therefore call it first
		stats.images = value.images;
    displayImages();

    //icons from stores are the next largest
    initStores();
    displayStores();

    //all other functions are fully synchronous
    initItems();

    stats.bag = [];
  	displayBag();

  	resetIntervals();
    if(stats.automine.value > 0){
      showAutomine();
    }else{
      hideAutomine();
    }
    intervals.eat.run = true;
    intervals.cool.run = true;
    updateIntervals();

    stats.hunger.starting_value = stats.hunger.value;
    stats.weight.starting_value = stats.weight.value;

    console.log("Game mode set to "+stats.game_mode+".");
		callback();
	});
}

function initCurKeys(){
	var keycount = 256;
	for(var i=0;i<keycount;i++){
		curKeys.push(false);
	}
}
function curKeyModifier(){
  for(var key in keyModifiers){
    if(curKeys[key.charCodeAt(0)]){
      return keyModifiers[key];
    }
  }
  return 1;
}

function initIntervals(){
	intervals = {
		"updateScreen":{
			"function": updateScreen,
			"time": function(){
				return 1000/settings.fps;
			},
			"intervalID": false,
			"run": true
		},
		"eat": {
			"function": eat,
			"time": function(){
				return stats.hunger.time;
			},
			"intervalID": false,
			"run": false
		},
    "automine": {
			"function": automine,
			"time": function(){
				return stats.automine.time;
			},
			"intervalID": false,
			"run": false
		},
    "cool": {
      "function": cool,
      "time": function(){
        return stats.temperature.time
      },
      "intervalID": false,
			"run": false
    }
	}
}
function resetIntervals(){
	for(var name in intervals){
		clearInterval(intervals[name].intervalID);
	}
	initIntervals();
}
function restartInterval(key){
	var interval = intervals[key];
	interval.intervalID = setInterval(interval.function, interval.time());
}
function updateIntervals(){
	for(var name in intervals){
		var interval = intervals[name];
		if(interval.run && !interval.intervalID){
			restartInterval(name);
		}
	}
}

function initGame(){
	$("#noscript").hide();
	$("#game").css("display", "block");

	displaySaveList();
	initTabs();
	initCurKeys();
  initIcons();

	stats.start = false;
}
function startGame(){
	stats.start = true;
	intervals.eat.run = true;
	window.start_time = Date.now();
	updateIntervals();
}
function clearGame(){
	intervals = {};
	stats = {};
	settings = {};
	items = {};
	stores = {};
	images = {};
}

function htmlSave(name){
  return $("<li>")
  .addClass("save "+name)
  .text(name)
  .append(
    $("<button>")
    .addClass("load-save")
    .attr("value", name)
    .html("Load")
  )
  .append(
    $("<button>")
    .addClass("delete-save")
    .attr("value", name)
    .html("Delete")
  );
}
function displaySaveList(){
	var savelist = readCookie(cookieListName);

	$(".save-list").html("");
	if(savelist){
		for(var i=0;i<savelist.length;i++){
			var name = savelist[i];
			if($(".save."+name).length == 0){
				$(".save-list").append(
          htmlSave(name)
				);
			}
		}

		var new_name_cond = (savelist.indexOf($("#savename").val()) !== -1);
		var save_num = savelist.length+1;
	}else{
		var new_name_cond = true;
		var save_num = 1;
	}

	if(new_name_cond){
		$("#savename").val("NEET #"+(save_num).toString());
	}
}

function setStat(stat, value){
	if((typeof value != "number" || value >= 0) && stats.alive){
		stats[stat].value = value;
		return true;
	}else{
		return false;
	}
}
function changeStat(stat, change){
	return setStat(stat, stats[stat].value+change);
}

function initIcons(){
  for(var item_name in items){
    if(!("icon" in items[item_name])){
      items[item_name].icon = "/res/ico/"+item_name+".jpg";
    }
  }
}

function htmlItem(item_name, action=""){
  return $("<tr>")
	.addClass("item "+item_name)
  .append(
		$("<td>")
    .addClass("img")
		.append(
			$("<img>")
      .addClass("action "+action)
			.attr("src", items[item_name].icon)
			.attr("value", item_name)
		)
  )
  .append(
    $("<td>")
		.addClass("item-info")
		.append(
			$("<div>")
			.addClass("item-title")
			.html(items[item_name].pretty_name)
		)
		.append(
			$("<div>")
			.addClass("item-price-container")
			.append(
				$("<div>")
				.addClass("item-price")
				.html(items[item_name].price)
			)
			.append(
				$("<div>")
				.html("NBX")
			)
    )
  )
	.append(
		$("<td>")
    .addClass("item-description")
		.html(items[item_name].description)
	)
}

function initStores(){
  stats.stores = {};
  console.log("Initializing stores...");
  for(var store_name in stores){
    console.log("Adding store: "+store_name);
    stats.stores[store_name] = [];
    for(var top_item_name in stores[store_name].tree){
      console.log("Adding item: "+top_item_name);
      stats.stores[store_name].push(top_item_name);
    }
  }
  console.log("Done initiliazing stores.");
}
function addStoreItem(store_name, item_name){
	for(var i=0; i<stats.stores[store_name].length;i++){
		var _item_name = stats.stores[store_name][i];
		if(_item_name > item_name){
			var idx = stats.stores[store_name].indexOf(item_name);
			if(idx == -1){
				stats.stores[store_name].splice(i, 0, item_name);
			}
			if($(".item_container."+_item_name).length != 0){
				$(".item_container."+_item_name).before(
					htmlItem(item_name, "buy")
				);
				return;
			}
		}
	}
	var idx = stats.stores[store_name].indexOf(item_name);
	if(idx == -1){
		stats.stores[store_name].push(item_name);
	}
	$(".store."+store_name).append(
		htmlItem(item_name, "buy")
	)
}
//breadth first tree search
function getSubTree(tree, item_name){
	for(var node in tree){
		if(node == item_name){
			return tree[node];
		}
	}
	for(var node in tree){
		sub = getSubTree(tree[node], item_name);
		if(!$.isEmptyObject(sub)){
			return sub;
		}
	}
	return {};
}
function removeStoreItem(item_name){
	var store_name = items[item_name].store_name;

	var idx = stats.stores[store_name].indexOf(item_name);
	if (idx != -1){
		stats.stores[store_name].splice(idx, 1);
		$(".item."+item_name).remove();
		var sub_tree = getSubTree(stores[store_name].tree, item_name);
		for(var sub_item in sub_tree){
			addStoreItem(store_name, sub_item);
		}

	}else{
		console.log('Warning: Trying to remove item which isn\'t in the store');
	}
}
function displayStores(){
  console.log("Displaying stores...")
	for(var store_name in stats.stores){
		var store = stats.stores[store_name];
		$(".store."+store_name).html("");
		for(var i=0;i<store.length;i++){
			var item_name = store[i];
			if($(".store ."+item_name).length == 0){
				console.log("Displaying item: "+item_name);
				addStoreItem(store_name, item_name);
			}
		}
	}
  console.log("Done displaying stores.")
}

function htmlImage(image_name){
	var parent = images[image_name].parent;
	var img = $("<div>")
    .addClass("container "+image_name)
		.css({
			"left": images[image_name].pos[0],
			"top": images[image_name].pos[1],
			"z-index": images[image_name].index
		})
		.append(
			$("<img>")
			.addClass(image_name)
			.attr("src", images[image_name].file)
		);
	if(parent == "me"){
		return img;
	}else{
		return img.append(
				$("<div>")
				.addClass(image_name+" value")
				.val(items[image_name].value)
			);
	}
}
function removeImage(image_name){
	$("img."+image_name).remove();
}
function displayImage(image_name){
  console.log("Displaying image: "+image_name);
  var container = "#"+images[image_name].parent+" .image_container";
  $(container).append(
    htmlImage(image_name)
  );
}
function displayImages(){
  console.log("Displaying images...");
	var clearedContainers = [];
	for(var i=0;i<stats.images.length;i++){
		var image_name = stats.images[i];
		var container = "#"+images[image_name].parent+" .image_container";
		if(clearedContainers.indexOf(container) < 0){
			$(container).html("");
			clearedContainers.push(container);
		}
    displayImage(image_name);
	}
  drawDesk();
  console.log("Done displaying images.");
}

function drawDesk(){
	$(".container.desk").append(
		$("<div>")
    .attr("id", "desk")
    .append(
      $("<div>")
      .addClass("desk right")
  		.css({
  			"left": images.desk.size[0],
  			"top": 0,
        "height": "100%"
  		})
    	).append(
    		$("<div>")
    		.addClass("desk bottom")
    		.css({
    			"left": 0,
    			"top": images.desk.size[1],
          "height": "100vh"
    		})
    	)
    );
}

function initItems(){
  console.log("Initializing items...");
  stats.items = {};
  for(var i in stats.images){
    var item_name = stats.images[i];
    console.log("Adding item: "+item_name);
    if(item_name in items){
      stats.items[items[item_name].type] = item_name;
    }
  }
  console.log("Done initializing items.");
}
function addItem(item_name){
	var item_type = items[item_name].type;
	stats.items[item_type] = item_name;
	displayImage(item_name);
}

function addBagItem(item_name){
  console.log("Adding item to bag: "+item_name);
	for(var i=0; i<stats.bag.length;i++){
		var _item_name = stats.bag[i];
		if(_item_name > item_name){
			var idx = stats.bag.indexOf(item_name);
			if(idx == -1){
				stats.bag.splice(i, 0, item_name);
			}
			if($(".item."+_item_name).length != 0){
				$(".item."+_item_name).before(
					htmlItem(item_name, "equip")
				);
				return;
			}
		}
	}
	var idx = stats.bag.indexOf(item_name);
	if(idx == -1){
		stats.bag.push(item_name);
	}
	$("#bag_body").append(
		htmlItem(item_name, "equip")
	);
}
function displayBag(){
	$("table.bag").html("");
	for(var i=0; i<stats.bag.length; i++){
		$("table.bag").append(
			htmlBagItem(stats.bag[i])
		);
	}
}
function removeBagItem(item_name){
	var idx = stats.bag.indexOf(item_name);
	if (idx != -1){
		stats.bag.splice(idx, 1);
		$(".item."+item_name).remove();
	}
}
function replaceItem(item_name){
	var item_type = items[item_name].type;
	var old_item = stats.items[item_type];

	removeImage(old_item);
	addBagItem(old_item);

	stats.items[item_type] = item_name;
	stats.images.splice(stats.images.indexOf(old_item), 1, item_name);
	displayImage(item_name);
}

function calcHunger(){
	return stats.hunger.starting_value+stats.hunger.rate*Math.max(0, stats.weight.value-stats.weight.starting_value);
}
function eat(){
	stats.hunger.value = calcHunger();
	var food = stats.hunger.value*items.tendies.weight;
	setStat("hunger", stats.hunger.value);
	if(changeStat("tendies", -food)){
		changeStat("weight", food);
    stats.tendies.color = "#000";
		stats.status.value[0] = "Meh";
		stats.status.color[0] = "#000";
    stats.keymine.color[0] = "#000";
		updateIntervals();
	}else{
		var food_left = food - stats.tendies.value;
		stats.tendies.value =  0;
    stats.tendies.color = "#f00";
		if(changeStat("weight", -food_left)){
			stats.status.value[0] = "Starving";
			stats.status.color[0] = "#d9d725";
      stats.keymine.color[0] = "#d9d725";
			updateIntervals();
		}else{
			die();
		}
	}
}

function automine(){
  changeStat("nbx", stats.automine.rate*stats.automine.value);
}
function showAutomine(){
  intervals.automine.run = true;
  $(".automine").show();
  $("#mine .left img").attr("src", "/res/img/miner_left.gif");
  $("#mine .right img").attr("src", "/res/img/miner_right.gif");
}
function hideAutomine(){
  $(".automine").hide();
  $("#mine .left img").attr("src", "/res/ico/gold_coin_left.png");
  $("#mine .right img").attr("src", "/res/ico/gold_coin_right.png");
}
function keymine(key){
  stats.keymine.value += key;

  if(!stats.start){
    startGame();
  }else if(stats.keymine.value.length > 50 || Math.random() < 0.1){
    var rate = stats.nbx.rate*stats.keyboard.value;
    //starving modifier
    if(stats.tendies.value == 0){
      rate *= stats.starving_rate.value;
    }
    changeStat("nbx", Math.pow(stats.keymine.value.length*rate,2));
  }else{
    return false;
  }
  stats.keymine.value="";
}
function die(){
	stats.alive=false;
	stats.status.value = ["Dead", "Dead"];
	stats.status.color = ["#f00", "#f00"];
  stats.keymine.color = ["#f00", "#f00"];
}
function buy(item_name, amount){
  var purchase_name = amount.toString()+" "+item_name;
	if(changeStat("nbx", -(amount*items[item_name].price))){
    var use = items[item_name].item_use;
		if(use == "store"){
			changeStat(item_name, amount);
		}else if(use == "upgrade"){
			var item_type = items[item_name].type;
			setStat(item_type, items[item_name].upgrade_level);

			removeStoreItem(item_name);
			replaceItem(item_name);
		}else if(use == "automine"){
      if(stats.automine.value == 0){
        showAutomine();
        updateIntervals();
      }
      changeStat("automine", amount);
    }
    console.log("Bought "+purchase_name+".")
	}else{
    console.log("Can't buy "+purchase_name+": Not enough bux.")
  }
}

function heat(amount){
  stats.temperature.value += amount;
  if(stats.temperature.value <= 95){
    stats.status.value[1] = "Freezing";
    stats.status.color[1] = "#82e7df";
    stats.keymine.color[1] = "#82e7df";
    if(stats.temperature.value <= 88){
      die();
    }
  }else if(stats.temperature.value >= 101){
    stats.status.value[1] = "Burning";
    stats.status.color[1] = "#ff7e00";
    stats.keymine.color[1] = "#ff7e00";
    if(stats.temperature.value >= 888){
      die();
    }
  }else{
    stats.status.value[1] = "Meh";
		stats.status.color[1] = "#000";
    stats.keymine.color[1] = "#000";
  }
}
function burn(item_name, amount){
  var burn_name = amount.toString()+" "+item_name;
  if(changeStat(item_name, -amount)){
    heat(amount*stats.temperature.rate);
    console.log("Burned "+burn_name+".");
    return true;
  }else{
	  console.log("Cannot burn "+burn_name+": you don't have enough");
    return false;
  }
}
function cool(){
  heat(-stats.temperature_rate.value);
}

function equip(item_name){
	var i = stats.bag.indexOf(item_name);
	if(i > -1){
		replaceItem(item_name);
		removeBagItem(item_name);
	}
}

function updateScreen(){
	// update item availability color
	for(var item in items){
		if(items[item].price>stats.nbx.value){
			items[item].color = "#f00";
		}else{
			items[item].color = "#000";
		}
		$($(items[item].store_id).parent()).css({"color":items[item].color});
	}

	for(var stat in stats){
		var stat_dom = $(stats[stat].selector);
    var val = stats[stat].value;
    var color = stats[stat].color;

		if(typeof val == "number"){
			val = val.toFixed(stats[stat].max_decimal);
		}
    if(val instanceof Array){
      if(val[0] == "Dead" || val[1] == "Meh"){
        stat_dom.html(val[0]);
        stat_dom.css({"color":color[0]});
      }else if(val[1] == "Dead" || val[0] == "Meh"){
        stat_dom.html(val[1]);
        stat_dom.css({"color":color[1]});
      }else{
        stat_dom.html(
          $("<span>")
          .html(val[0])
          .css({"color":color[0]})
        )
        .append(
          $("<span>")
          .html(", ")
        )
        .append(
          $("<span>")
          .html(val[1])
          .css({"color":color[1]})
        )
      }
		}else{
      stat_dom.html(val);
      if(color instanceof Array){
        if(color[0] == "#f00" || color[1] == "#000"){
          color = color[0];
        }else{
          color = color[1];
        }
      }
  		stat_dom.css({"color":color});
    }
	}
  if(anims.burn.value){
    if($("#fire img").attr("src") != "/res/img/tendies_fire.svg"){
      $("#fire img").attr("src", "/res/img/tendies_fire.svg");
    }
    if(anims.burn.stop <= Date.now()){
      anims.burn.value = false;
      $("#fire img").attr("src", "/res/img/tendies_nofire.svg");
    }
  }
}

function showTab(tab){
	$(tab).addClass("active");
	var name = $(tab).attr("name");
	$(".from-tab-"+name).show();
}
function hideTabSiblings(tab){
	$(tab).parent().siblings().each(function(i){
		link = $(this).children();
		$(link).removeClass("active");
		var name = $(link).attr("name");
		$(".from-tab-"+name).hide();
	});
}
function initTabs(){
	$(".tabs > li > .active").each(function(i){
		hideTabSiblings(this);
	});
}

$(function(){
	loadVars(function(){
		$(document).keydown(function(event){
      //exclude control characters
      if(!stats.alive){
				return event.keyCode;
			}
      if(event.keyCode >= 32 && !curKeys[event.key.charCodeAt(0)]){
        keymine(event.key);
      }
      curKeys[event.key.charCodeAt(0)] = true;
		})
		$(document).keyup(function(event){
			curKeys[event.key.charCodeAt(0)] = false;
		});
		$(document).on('click', '.buy', function(event){
			var item_name = $(event.target).attr("value");
      var amount = curKeyModifier();
			buy(item_name, amount);
		});
		$(document).on('click', '.equip', function(event){
			var item_name = $(event.target).attr("value");
			equip(item_name);
		});
		$(document).on('click', '.tabs > li > a', function(event){
			showTab($(this));
			hideTabSiblings($(this));
		});
		$(document).on('click', '.write-save', function(event){
      var name = $("#savename").val();
      if(name){
        writeSave(name);
      }
		});
		$(document).on('click', '.load-save', function(event){
			loadSave($(this).attr("value"));
		});
		$(document).on('click', '.delete-save', function(event){
			deleteSave($(this).attr("value"));
		});
		$(document).on('click', '#fire', function(event){
			var amount = curKeyModifier();
			if(burn("tendies", amount)){
        anims.burn.value = true;
        anims.burn.stop = anims.burn.duration + Date.now();
      }else{
        anims.burn.value = false;
      }
		});
		$(document).on('submit', '#settings > form', function(event){
			gamemode = $('#gamemode').val();
			setGameMode(function(){}, gamemode);
			event.preventDefault();
		});
	});
});
