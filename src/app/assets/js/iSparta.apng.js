(function ($) {
	var child_process = require('child_process'),
		os = require('os'),
		fs = require('fs-extra'),
		Path = require('path'),
		gui = require('nw.gui'),
		doT = require('dot'),
		i18n = require('i18n');
	var $loop=$("#apng_select_loop"),
		$config=$("#apng_select_config"),
		$rate=$("#apng_select_rate"),
		$quality=$("#apng_select_quality"),
		$savePath=$("#apng_select_savePath"),

		$currentLanguage=$("#apng_select_language"),
		$currentPath=$("#apng_select_currentPath"),
		$btnCurrentPath=$("#apng_btn_currentPath"),
		$refresh=$("#apng_currentPath_refresh"),
		$btnSavePath=$("#apng_btn_savePath"),
		$hSavePath=$("#apng_savePath_hidden"),
		$hPath=$("#apng_path_hidden"),
		$btnCov=$("#apng_btn_cov"),
		$dragArea=$("#apng .drag_area"),
		$boxPreview=$("#apng .box_preview"),
		
		$itemOpenPos=$("#apng .imglist .icon-folder-open"),
		tmplFileList = $('#apng_tmpl_filelist').html();
		tmplBoxPreview = $boxPreview.html();
	
	window.iSparta.apng ={
		options:{
			loop:0,
			rate:1,
			config:'lossless',
			quality:60,
			savePath:["parent","self"],
			currentPath:[],
			otherFiles:[],
			mixListIndex:0,
			savePathIndex:0,
			currentPathIndex:0
		},
		defalueOptions:{},
		fileList:[],
		nums:0,
		index:0,
		isClose:false,
		mixIndex:0,
		hasInit:false,
		init:function(){
			localData=window.iSparta.localData;
			this.defalueOptions=this.options;
			var options=localData.getJSON("apng");
			$.extend(this.options,options);

			options=this.options;
			$loop.val(options.loop);
			$config.val(options.config);
			$rate.val(options.rate);
			$quality.val(options.quality);
			$currentLanguage.val(window.locale.getLocale());

			for(var i=0;i<options.savePath.length;i++){
				if(options.savePath[i]=="parent"){
					var opt=new Option(i18n.__("Parent directory"),options.savePath[i]);
				}else if(options.savePath[i]=="self"){
					var opt=new Option(i18n.__("Same level directory"),options.savePath[i]);
				}else{
					var opt=new Option(options.savePath[i],options.savePath[i]);
				}
				
				if(i==options.savePathIndex){
					$(opt).attr("selected","selected");
				}
				$savePath[0].options.add(opt);
			}
			for(var i=0;i<options.currentPath.length;i++){
				var opt=new Option(options.currentPath[i],options.currentPath[i]);
				if(i==options.currentPathIndex){
					$(opt).attr("selected","selected");
					var fileList=[{path:options.currentPath[i]}];
					var otherFiles=[];
					if(options.currentPath[i].indexOf(i18n.__("Convert list"))==0){

						fileList=[];
						for(var j=0;j<options.otherFiles.length;j++){
							if(options.currentPath[i]==i18n.__("Convert list")+options.otherFiles[j].id){
								for(var k=0;k<options.otherFiles[j].path.length;k++){
									fileList.push({path:options.otherFiles[j].path[k]});
								}
							}
						}
					}

					this.ui.fillImglist(fileList);
				}
				$currentPath[0].options.add(opt);
				
			}
			this.ui.init();
			window.iSparta.apng.hasInit = true;
		},
		switch:function(id){

			if(!this.fileList[0]){
				window.iSparta.ui.showTips(i18n.__("No image selected"));
				return;
			}
			var files=this.fileList[0].files;
			if(this.nums==0){
				for(var j=0;j<files.length;j++){
					if(files[j].selected==true){
						this.nums++;
					}
				}
			}
			if(this.nums==0){
				window.iSparta.ui.showTips(i18n.__("No image selected"));
			}else{
				
				if(!id){
					
								
					id=0;
					
				}
				while(files[id]){
					if(files[id].selected==true){
						break;
					}
					id++;
				}
				
				if(id<files.length&&this.isClose==false){
					var progress=(this.index+1)/this.nums;
		
					window.iSparta.ui.showProgress(progress,i18n.__("Processing images: (%s/%s)", this.index+1, this.nums),function(){
						window.iSparta.apng.isClose=true;
					});
					this.index++;
					this.exec(id);
				}else{
					
					var filesInfo=window.iSparta.apng.fileList[0].files;
					
					var Allinfo=[];
					var postData=[];
					for(var i=0;i<filesInfo.length;i++){
						if(filesInfo[i].selected==true){
							var info={};
							info.name=filesInfo[i].name;
							info.beforesize=filesInfo[i].allPngSize;
							info.aftersize=filesInfo[i].apngsize;

							info.num=filesInfo[i].url.length;
							Allinfo.push(info);
						}
					}
					for(var i=0;i<this.index;i++){
						postData[i]=Allinfo[i];
					}
					
					window.iSparta.postData(postData,"apng");
					this.nums=0;
					this.index=0;
					this.isClose=false;
					window.iSparta.ui.hideProgress();
					window.iSparta.ui.hideLoading();
				}
			}
			

		},
		exec:function(id){
			var self=this;
			var loop=this.options.loop;
			var rate=this.options.rate;
			var config=this.options.config;
			var quality=this.options.quality;
			var savePath=this.options.savePath[this.options.savePathIndex];
			var files=this.fileList[0].files;
			var url=files[id].url[0];
			var urls=files[id].url;
			var name=files[id].name;
			var path=savePath+window.iSparta.sep+name+".png";
			var saveDir=savePath+window.iSparta.sep;
			if(savePath=="parent"){
				var path=files[id].pppath+window.iSparta.sep+name+".png";
				saveDir=files[id].pppath+window.iSparta.sep;
			}else if(savePath=="self"){
				var path=files[id].ppath+window.iSparta.sep+name+".png";
				saveDir=files[id].ppath+window.iSparta.sep;
			}
			saveDir=window.iSparta.handlePath(saveDir);
			path=window.iSparta.handlePath(path);
			
			var apngasm = process.cwd() + '/app/libs/apng/'+iSparta.getOsInfo()+'/apngasm';
			// var apngopt = process.cwd() + '/app/libs/apng/'+iSparta.getOsInfo()+'/apngopt';
			var pngquant = process.cwd() + '/app/libs/pngloss/'+iSparta.getOsInfo()+'/pngquant';
			var pngout = process.cwd() + '/app/libs/imglossless/'+iSparta.getOsInfo()+'/pngout';
		   
			var tempdir=Path.join(os.tmpdir(), '/iSparta/');
			tempdir=window.iSparta.handlePath(tempdir);
			apngasm=window.iSparta.handlePath(apngasm);
			// apngopt=window.iSparta.handlePath(apngopt);
			pngquant=window.iSparta.handlePath(pngquant);
			pngout=window.iSparta.handlePath(pngout);

			var qualityArg = quality >= 10 ? ' --quality '+(quality - 10)+'-'+quality : ''
			var originPngPaths = [];

			dirHandle();

			function dirHandle(){
				fs.removeSync(tempdir);
				fs.mkdirsSync(tempdir);
				var urlsPromises = urls.map(function(url,i){
					return new Promise(function(resolve, reject) {
						var tempPath = tempdir+'png'+(i+1)+'.png';
						originPngPaths[i] = tempPath;
						fs.copy(url, tempPath, function(err) {
							if (err) {
								throw err;
							} else {
								resolve();
							}
						});
					});
				});
				Promise.all(urlsPromises).then(function() {
					png2apngExec();
				}).catch(function(err) {
					console.log(err);
					window.iSparta.ui.hideLoading();
					window.iSparta.ui.hideProgress();
					window.iSparta.ui.showTips(i18n.__("Program error occurred:") + err);
					fs.removeSync(tempdir);
				});
			};
			function png2apngExec() {
				pngoptExec().then(function() {
					return apngasmExec();
				}).then(function() {
					window.iSparta.apng.switch(id+1);
				}).catch(function(err) {
					console.log(err);
					window.iSparta.ui.hideLoading();
					window.iSparta.ui.hideProgress();
					window.iSparta.ui.showTips(i18n.__("Convert failed! Please check PNG file format, the image size should be equal"));
					fs.removeSync(tempdir);
				});
			}
			function pngoptExec() {
				var originPngPromises = originPngPaths.map(function(pngPath,i) {
					if (config === 'lossy') {
						return pngquantExec(pngPath,i);
					} else {
						return pngoutExec(pngPath,i);
					}
				});
				return Promise.all(originPngPromises);
			}
			// png lossy compression
			function pngquantExec(pngPath,i) {
				var outputPath = tempdir+'frame'+(i+1)+'.png';
				var pngquantcomd = '"'+pngquant+'" --force'+qualityArg+' --output "'+outputPath+'" "'+pngPath+'"';
				return new Promise(function(resolve, reject) {
					child_process.exec(pngquantcomd, {timeout: 1000000}, function(err, stdout, stderr) {
						if (err) {
							console.log('stdout: ' + stdout);
							console.log('stderr: ' + stderr);
							reject(err);
						} else {
							resolve();
						}
					});
				});
			}
			// png lossless compression
			function pngoutExec(pngPath,i) {
				var outputPath = tempdir+'frame'+(i+1)+'.png';
				var pngoutcomd = '"'+pngout+'" "'+pngPath+'" "'+outputPath+'" -force -y';
				return new Promise(function(resolve, reject) {
					child_process.exec(pngoutcomd, {timeout: 1000000}, function(err, stdout, stderr) {
						if (err) {
							console.log('stdout: ' + stdout);
							console.log('stderr: ' + stderr);
							reject(err);
						} else {
							resolve();
						}
					});
				});
			};
			// png to apng asm
			function apngasmExec() {
				var inputPath = tempdir+'frame*.png';
				var apngasmcomd = '"'+apngasm+'" "'+path+'" "'+inputPath+'" '+rate*100+' 100'+' -l'+loop+'';
				return new Promise(function(resolve, reject) {
					child_process.exec(apngasmcomd, {timeout: 1000000}, function(err, stdout, stderr) {
						if (err) {
							console.log('stdout: ' + stdout);
							console.log('stderr: ' + stderr);
							reject(err);
						} else {
							resolve();
						}
					});
				});
			};
			// apng opt is buggy for / parse(on macOS and Linux)
			// and the disposal optimise is also included in apngasm, so we drop out this process
			// function apngoptExec() {
			// 	var inputPath = tempdir+"apngout.png";
			// 	var apngoptcomd = '"'+apngopt+'" "'+inputPath+'" "'+path+'"';
			// 	return new Promise(function(resolve, reject) {
			// 		child_process.exec(apngoptcomd, {timeout: 1000000}, function(err, stdout, stderr) {
			// 			if (err) {
			// 				console.log('stdout: ' + stdout);
			// 				console.log('stderr: ' + stderr);
			// 				reject(err);
			// 			} else {
			// 				resolve();
			// 			}
			// 		});
			// 	});
			// };
		}
	};
	// 界面操作
	var DataBuilder = function() {
		this.parts = [];
	};
	DataBuilder.prototype.append = function(data) {
		this.parts.push(data);
	};
	DataBuilder.prototype.getUrl = function(contentType) {
		//if (global.btoa) {
			return "data:" + contentType + ";base64," + btoa(this.parts.join(""));
		//} else { // IE
		  //  return "data:" + contentType + "," + escape(this.parts.join(""));
		//}
	};
	DataBuilder.prototype.getStr= function() {
  
		return this.parts.join("");
		
	};

	window.iSparta.apng.ui={
		dataHelper:{},
		init:function(){
			this.dataHelper=window.iSparta.apng.dataHelper;
			this.topbar();
			this.preview();
			this.items();
			this.status();
		},
		topbar:function(){
			var ui=this;
			$loop.on("change",function(){
				ui.dataHelper.changeLoop($(this).val());
			});
			$quality.on("change",function(){
				ui.dataHelper.changeQuality($(this).val());
			});
			$config.on("change",function(){
				ui.dataHelper.changeConfig($(this).val());
			});
			$rate.on("change",function(){
				ui.dataHelper.changeRate($(this).val());
			});
			$savePath.on("change",function(){
				ui.dataHelper.changeSavaPath($(this).val());
			});
			$btnSavePath.on("click",function(){
				$hSavePath.click();
			});
			$hSavePath.on("change",function(e){

				var val=$(this).val();
				var opt=new Option(val,val);
				$(opt).attr("selected","selected");
				$savePath[0].insertBefore(opt,$savePath[0].options[0])
				//$savePath[0].options.add(opt);
				ui.dataHelper.changeSavaPath(val);
			});
			$btnCov.on("click",function(){
				window.iSparta.apng.switch();
			});
		},
		preview:function(){
			var ui=this;
			$boxPreview[0].ondragover = function() { 
				$dragArea.addClass("hover");
				return false;
			};

			$boxPreview[0].ondragleave = function(e) { 
				$dragArea.removeClass("hover");
				return false;
			};
			$boxPreview[0].ondrop = function(e) {
				var apng=window.iSparta.apng;
				e.preventDefault();
				$dragArea.removeClass("hover");
				e.preventDefault(); //取消默认浏览器拖拽效果
				var otherFiles = e.dataTransfer.files; //获取文件对象
				apng.options.mixListIndex++;
				var mixIndex=apng.options.mixListIndex;
				//var opt=new Option(fileList[0].path,fileList[0].path);
				var v=ui.fillImglist(otherFiles);
				if(v){
					var fileList=i18n.__("Convert list")+mixIndex;
					var opt=new Option(i18n.__("Convert list")+mixIndex,i18n.__("Convert list")+mixIndex);
					$(opt).attr("selected","selected");
					$currentPath[0].insertBefore(opt,$currentPath[0].options[0]);
					ui.dataHelper.changeCurrentPath(fileList,otherFiles);
				}
				
				return false;
			};
			$dragArea.click(function(e) {
				$hPath.click();
				return false;
			});
			$hPath.on("change",function(e){
				var fileList = e.delegateTarget.files; //获取文件对象
				
				
				var val=$(this).val();
				if(ui.fillImglist(fileList)){
					var opt=new Option(val,val);
					$(opt).attr("selected","selected");
					$currentPath[0].insertBefore(opt,$currentPath[0].options[0]);
					ui.dataHelper.changeCurrentPath(val);
				}
				
				return false;
			});
		},
		fillImglist:function(fileList){
			if(fileList.length == 0){
				return false;
			}
			window.iSparta.ui.showLoading();

			if(!window.iSparta.apng.fileManager.walk(fileList,function(){})){
				window.iSparta.ui.hideLoading();
				window.iSparta.ui.showTips(i18n.__("Directory load failed! Please check whether the directory exists, disk letter is not allowd"));
				return false;

			};
			window.iSparta.ui.hideLoading();

			var datas={};
			var fileList=window.iSparta.apng.fileList;
			
			var delIndex=[];

			for(var i=0;i<fileList.length;i++){
				
				for(var j=0;j<fileList[i].files.length;j++){
					
					if(fileList[i].files[j].url.length<2){
						var temp=[i,j]
						delIndex.push(temp);
					}
				}
				
			}
			for(var i=0;i<delIndex.length;i++){
				
				fileList[delIndex[i][0]].files.splice(delIndex[i][1]-i,1);
			}
			window.iSparta.apng.fileList=fileList;
			datas.all=window.iSparta.apng.fileList;
		   
			if(datas.all.length==0){
				if (window.iSparta.apng.hasInit) {
					window.iSparta.ui.showTips(i18n.__("Please select multiple PNG images, keep the filename serialized and image size equal"));
				}
				$boxPreview.html(tmplBoxPreview);
			}else{
				var doTtmpl = doT.template(tmplFileList);
				var html=doTtmpl(datas);
				$boxPreview.html(html);
			}

			return true;
		},
		items:function(){
			var timer=null;
			var ui=this;
			var urlIndex=0;
			$boxPreview.on("click",".imglist .thumb",function(){
				var fileList=window.iSparta.apng.fileList;
				var li=$(this).closest("li");
				var pid=li.attr("data-pid");
				var id=li.attr("data-id");
				li.toggleClass("checked");
				if(li.hasClass("checked")){
					fileList[pid].files[id].selected=true;
				}else{
					fileList[pid].files[id].selected=false;
				}
			});

			$boxPreview.on("mouseover",".imglist .thumb",function(){
				var fileList=window.iSparta.apng.fileList;
				var li=$(this).closest("li");
				var pid=li.attr("data-pid");
				var id=li.attr("data-id");
				
				var that=$(this);
				
				timer=setInterval(function(){
					if(urlIndex>fileList[pid].files[id].url.length-1){
						urlIndex=0;
					}
					that.find("img").attr("src",fileList[pid].files[id].url[urlIndex]);
					urlIndex++;
				},window.iSparta.apng.options.rate*1000);
			});
			$boxPreview.on("mouseout",".imglist .thumb",function(){
				var fileList=window.iSparta.apng.fileList;
				var li=$(this).closest("li");
				var pid=li.attr("data-pid");
				var id=li.attr("data-id");
				clearInterval(timer);
				$(this).find("img").attr("src",fileList[pid].files[id].url[0]);
			});
			$boxPreview.on("click",".imglist .icon-folder-open",function(){
				var url=$(this).attr("data-href");
				gui.Shell.showItemInFolder(url);
			});
			$boxPreview.on("blur",".imglist input[type='text']",function(){
				var name=$(this).val();
				var fileList=window.iSparta.apng.fileList;
				var li=$(this).closest("li");
				var pid=li.attr("data-pid");
				var id=li.attr("data-id");
				fileList[pid].files[id].name=name;
			});
		},
		status:function(){
			var ui=this;
			$currentPath.on("change",function(){
				var options=window.iSparta.apng.options;
				var path=$(this).val();

				if(path.indexOf(i18n.__("Convert list"))==0){
					var fileList=[];
					for(var j=0;j<options.otherFiles.length;j++){

						if(path==i18n.__("Convert list")+options.otherFiles[j].id){
							for(var k=0;k<options.otherFiles[j].path.length;k++){
								fileList.push({path:options.otherFiles[j].path[k]});
							}
						}
					}
				}else{
					var fileList=[{path:path}];
				}
				ui.dataHelper.changeCurrentPath($(this).val());
				ui.fillImglist(fileList);
				

			});
			$btnCurrentPath.on("click",function(){
				$hPath.click();
			});
			$refresh.on("click",function(){
				var path=$currentPath.val();
				var options=window.iSparta.apng.options;
				if(path.indexOf(i18n.__("Convert list"))==0){
					var fileList=[];
					for(var j=0;j<options.otherFiles.length;j++){

						if(path==i18n.__("Convert list")+options.otherFiles[j].id){
							for(var k=0;k<options.otherFiles[j].path.length;k++){
								fileList.push({path:options.otherFiles[j].path[k]});
							}
						}
					}
				}else{
					var fileList=[{path:path}];
				}		
				ui.fillImglist(fileList);		
				return false;
			});
			$currentLanguage.on('change', function() {
				var locale=$(this).val();
				window.locale.changeLocale(locale);
			});
		}
	};
	// 数据控制
	window.iSparta.apng.dataHelper={
		changeLoop:function(loop){
			var apng=window.iSparta.apng;
			apng.options.loop=loop;
			window.iSparta.localData.setJSON("apng",apng.options);
		},
		changeQuality:function(quality){
			var apng=window.iSparta.apng;
			apng.options.quality=quality;
			window.iSparta.localData.setJSON("apng",apng.options);
		},
		changeConfig:function(config){
			var apng=window.iSparta.apng;
			apng.options.config=config;
			window.iSparta.localData.setJSON("apng",apng.options);
		},
		changeRate:function(rate){
			var apng=window.iSparta.apng;
			apng.options.rate=rate;
			window.iSparta.localData.setJSON("apng",apng.options);
		},
		changeSavaPath:function(savePath){
			var apng=window.iSparta.apng;
			var theSavePath=apng.options.savePath;
			for(var i=0;i<theSavePath.length;i++){
				if(savePath==theSavePath[i]){
					break;
				}
			}

			var index=$savePath[0].selectedIndex;
			if((i!=theSavePath.length)||savePath=="parent"||savePath=="self"){
				apng.options.savePathIndex=i;
				window.iSparta.localData.setJSON("apng",apng.options);
			}else{
				if(apng.options.savePath.length>6){
					apng.options.savePath.splice(4,1);
				}
				var len=apng.options.savePath.length;
				apng.options.savePath.unshift(savePath);
				apng.options.savePathIndex=0;
				window.iSparta.localData.setJSON("apng",apng.options);
			}
			
		},
		changeCurrentPath:function(currentPath,theOtherFiles){
			var apng=window.iSparta.apng;
			var theCurrentPath=apng.options.currentPath;
			
			if(currentPath.indexOf(i18n.__("Convert list"))==0){
				for(var i=0;i<theCurrentPath.length;i++){
					if(currentPath==theCurrentPath[i]){
						break;
					}
				}
				var index=$currentPath[0].selectedIndex;
				if(i!=theCurrentPath.length){
					apng.options.currentPathIndex=i;
					window.iSparta.localData.setJSON("apng",apng.options);
				}else{
					if(apng.options.currentPath.length>4){
						apng.options.currentPath.splice(4,1);
					}
					apng.options.currentPath.unshift(currentPath);
					var len=apng.options.currentPath.length;
					apng.options.currentPathIndex=0;
					var otherFiles={id:apng.options.mixListIndex,path:[]};
					for(var i=0;i<theOtherFiles.length;i++){
						otherFiles.path.push(theOtherFiles[i].path);
					}
					
					apng.options.otherFiles.push(otherFiles);
					
					window.iSparta.localData.setJSON("apng",apng.options);
				}
			}else{
				for(var i=0;i<theCurrentPath.length;i++){
					if(currentPath==theCurrentPath[i]){
						break;
					}
				}
				var index=$currentPath[0].selectedIndex;
				if(i!=theCurrentPath.length){
					apng.options.currentPathIndex=i;
					window.iSparta.localData.setJSON("apng",apng.options);
				}else{
					if(apng.options.currentPath.length>4){
						apng.options.currentPath.splice(4,1);
					}
					apng.options.currentPath.unshift(currentPath);
					var len=apng.options.currentPath.length;
					apng.options.currentPathIndex=len-i+1;
					
					window.iSparta.localData.setJSON("apng",apng.options);
				}
			}
			
		}
	};
	// 文件目录递归与操作
	window.iSparta.apng.fileManager={
		length:-1,
		nowLen:0,
		names:[],
		allsize:0,
		maxDepth:3,
		nowDepth:0,
		Apng:{},
		walk:function(fileList,callback){
			// 一次只拉一个文件夹
			var Apng=this.Apng;
			this.length=0;
			Apng.fileList=[];
			this.names=[];
			if(fileList[0].path.length==3){
				return false;
			}
			for(var i=0;i<fileList.length;i++){
				
				var path=fileList[i].path;
				
				if(!fs.existsSync(path)){
					// console.log(fs.existsSync(path))
					return false;
				}
				this.nowDepth=-1;
				if(fs.statSync(path).isDirectory()){
					this.nowDepth++;
					var dirs={};
					var url=path.substring(0,path.lastIndexOf(window.iSparta.sep));
					dirs.url=url;
					dirs.length=this.length+i;
					dirs.files=[];
					Apng.fileList.push(dirs);
					this.walkDir(path);
					//fileWalk.length++;
				}else if(fs.statSync(path).isFile()){
					var url=path.substring(0,path.lastIndexOf(window.iSparta.sep));
					var dirs={};
					
					//if(fileWalk.length==0||url!=fileWalk.allFileList[fileWalk.length].url){
						dirs.url=url;
						dirs.files=[];
						if(this.nowLen!=this.length||(this.length==0&&(!Apng.fileList[this.length]||url!=Apng.fileList[this.length].url))){
							Apng.fileList.push(dirs);
						}
						if(this.nowLen!=this.length){
							this.nowLen=this.length
						}
						this.walkFile(path);
						//return ;
				   // }
					//fileWalk.walkFile(path);

				}
				
				
			}
			this.nowDepth=-1;
			var len=Apng.fileList.length;
			var listTemp=Apng.fileList;
			for(var i=len-1;i>=0;i--){
				var len2=Apng.fileList.length;
				if(Apng.fileList[i].files.length==0){
					
					Apng.fileList.splice(len2-1,1);
				   
				}
			}
			window.iSparta.apng.fileList=Apng.fileList;
			if((typeof callback)=='function'){
				callback();
			}
			return true;
		},
		walkFile:function(path){
			//var apng={name:name};
			 var Apng=this.Apng;
			if(/.*\d+\.png$/i.test(path)){
				//apng.frames.push(path);
				var url=path;
				var repeatIndex=-1;
			   
				var allfile=Apng.fileList[this.length].files;
				var stat=fs.statSync(path);
				var size=stat.size;
				path2=path;
				path=path.replace(/\d+\.png$/i,"");
				
				var ppath=path.substring(0,path.lastIndexOf(window.iSparta.sep));
				var pppath=ppath.substring(0,ppath.lastIndexOf(window.iSparta.sep));
				var name=path.substring(path.lastIndexOf(window.iSparta.sep)+1,path.length);
				if(name.length<2){
					name=path.substring(0,path.lastIndexOf(window.iSparta.sep));
					name=name.substring(name.lastIndexOf(window.iSparta.sep)+1,name.length);
				}
				var index=0;
				for(var i=0;i<this.names.length;i++){
					if(name==this.names[i]){
						
						var name2=this.names[i].match(/(.*?)(\d+)$/i);

						if(name2){
							
							var num=parseInt(name2[2]);
							var pre=name2[1];
							if(num>index){
								num=num+1;
								name=pre+num;
							}
						}else{
							 name=name+1;
						}
					}
				}
				for(var i=0;i<allfile.length;i++){
					if(path==allfile[i].path){
						repeatIndex=i;
					}
				}
				if(allfile.length!=0&&repeatIndex!=-1){
					allfile[repeatIndex].url.push(url);
					allfile[repeatIndex].allPngSize+=size;

				}else{
					if(allfile.length!=0&&allfile[allfile.length-1].url.length==1){
						allfile.splice(allfile.length-1,1);
					}
					var file={path2:path,path:path,ppath:ppath,pppath:pppath,selected:true};
					file.url=[];
					
					
					file.name=name;
					file.allPngSize=size;
					this.names.push(name);
					file.url.push(url);
					allfile.push(file);
					file.allPngSize=0;
				}
			}
		},
		walkDir:function(path){
			var dirList = fs.readdirSync(path);
			var that=this;
			that.nowDepth++;
			dirList.forEach(function(item){
				
				if(fs.statSync(path + window.iSparta.sep + item).isDirectory()){ 
					
					if(that.nowDepth<that.maxDepth){
						
						that.walkDir(path + window.iSparta.sep + item);

					}
					if(that.nowDepth>=that.maxDepth){
						
					
					}
					
					
				   
				}else if(fs.statSync(path + window.iSparta.sep + item).isFile()){
					that.walkFile(path + window.iSparta.sep + item);
				}
			});
			that.nowDepth--;
			
		}
	}


})(jQuery);