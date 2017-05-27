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

var cookiePrefix = "NEET-SIMULATOR-SAVE:";
var cookieListName = "NEET-SIMULATOR-SAVE-LIST";

function createCookie(name, value, days){
	if (!days) {
		days = 88;
	}

	var date = new Date();
	date.setTime(date.getTime()+(days*24*60*60*1000));

	document.cookie = name+"="+btoa(JSON.stringify(value))+"; expires="+date.toGMTString()+"; path=/";
}

function readCookie(name) {
	var nameEQ = name + "=";
	var ca = document.cookie.split(';');
	for(var i=0;i < ca.length;i++) {
		var c = ca[i];
		while (c.charAt(0)==' ') c = c.substring(1,c.length);
		if (c.indexOf(nameEQ) == 0) return JSON.parse(atob(c.substring(nameEQ.length,c.length)));
	}
	return null;
}

function eraseCookie(name) {
	createCookie(name,"",-1);
}

function getSaveCookieName(name){
	return cookiePrefix.concat(name);
}

function loadSave(name){
	var cookieName = getSaveCookieName(name);
	var save = readCookie(cookieName);
	stats = save.stats;
	settings = save.settings;

	displayStores();
	displayImages();
  initItems();
	displayBag();

	resetIntervals();
  if(stats.automine.value > 0){
    showAutomine();
  }else{
    hideAutomine();
  }
  intervals.eat.run = true;
  updateIntervals();
}
function writeSave(name){
	var cookieName = getSaveCookieName(name);
	var save = {
		stats: stats,
		settings: settings
	};
	createCookie(cookieName, save);

	var savelist = readCookie(cookieListName);
	if(savelist){
		//insert savename in numerical order
		var last = true;
		for(var i=0;i<savelist.length;i++){
			var _name = savelist[i];
			//insert name before greater name
			if(_name > name){
				savelist.splice(i, 0, name);
				last = false;
			//if identical names are found, increment the number
			}else if(_name == name){
				split = name.split("#");
				name = split[0]+"#"+(parseInt(split[1])+1).toString();
			}
		}
		if(last){
			savelist.push(name);
		}
	}else{
		savelist = [name];
	}
	createCookie(cookieListName, savelist);
	displaySaveList();
}
function deleteSave(name){
	eraseCookie(getSaveCookieName(name));
	var savelist = readCookie(cookieListName);
	var idx = savelist.indexOf(name);
	if(idx > -1){
		savelist.splice(idx, 1);
	}

	createCookie(cookieListName, savelist);
	displaySaveList();
}

function clearSaves(){
	var savelist = readCookie(cookieListName);
  if(savelist != null){
  	for(var i=0; i<savelist.length; i++){
  		console.log(savelist[i]);
  		eraseCookie(getSaveCookieName(savelist[i]));
  	}
  	eraseCookie(cookieListName);
  	displaySaveList();
  }
}
