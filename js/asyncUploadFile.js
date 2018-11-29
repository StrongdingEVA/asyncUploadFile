jQuery.fn.extend({
    asyncUpload:function(cfg){
        var cfg = cfg;
        this.cfg = {};
        this.cfg.filePanel = cfg.filePanel; //文件域选择器
        this.cfg.upField = cfg.upField || "file"; //文件域名称
        this.cfg.autoUpload = cfg.autoUpload == false ? cfg.autoUpload : true; //默认开启自动上传
        this.cfg.alowType = cfg.alowType || ["jpg","jpeg","gif","png","mp4","exe","zip"]; //默认允许文件后缀
        this.cfg.maxSize = cfg.maxSize || 1024 * 1024 * 100; //默认最大上传尺寸2M
        this.cfg.imgPanel = cfg.imgPanel || ""; //盛放image的容器
        this.cfg.cliText = cfg.cliText || "点击上传"; //未开启自动上传时 生成的按钮的文字
        this.cfg.cliBtn = cfg.cliBtn || ''; //手动点击按钮
        this.cfg.maxLen = cfg.maxLen || 1; //默认允许最多上传文件个数
        this.cfg.upUrl = cfg.upUrl || ''; //文件上传路径
        this.cfg.isMulti = cfg.isMulti || false;

        this.cfg.autoSlice = cfg.autoSlice == false ? cfg.autoSlice : true;
        this.cfg.modelLimt = 1024 * 1024 * 5; //文件大于这个尺寸使用分片上传
        this.cfg.sliceSize = 1024 * 1024 * 2; //每片大小
        this.cfg.model = cfg.model || 1; //文件上传方式 1普通上传 2 分片上传
        this.cfg.callBack = cfg.callBack || {};
        this.cfg.sliceUploadUrl = cfg.sliceUploadUrl || '';
        this.cfg.showProgress = true;
        this.cfg.process = { //进度条相关
            percentage:0,//初始化进度
            stepMin:5, //步进最小进度
            stepMax:20,//步进最大进度
            stop:98,
            list:{}
        };

        this.cfg.status = 1;
        this.cfg.hexList = ['PD9waHA','PHNjcmlwdD4'];
        // 'PD9waHA=' === '<?php'
        // 'PHNjcmlwdD4=' ==== '<script>'
        this.end = this.start + this.cfg.sliceSize;
        this._init(this.cfg);
    },
    fileObjs : [],
    start : 0,
    end : 0,
    block : 0,
    slices : [],
    _init: function(cfg) {
        if(!cfg.filePanel || $(cfg.filePanel).length != 1){
            this.setError(this.getError(1));return;
        }else if(!cfg.upUrl){
            this.setError(this.getError(2));return;
        }else if(!cfg.autoUpload){
            if(!cfg.cliBtn || $(cfg.cliBtn).length != 1){
                this.setError(this.getError(8));return;
            }
        }

        //为容器绑定点击事件
        var that = this;
        $(cfg.filePanel).bind('click',function(){
            var inp = $('<input type="file" multiple style="display:none">');
            $(this).after(inp);
            that.bindChange(inp);
            inp.click();
        })

        //为上传按钮绑定点击事件
        if(cfg.autoUpload === false){
            $(cfg.cliBtn).bind('click',function(){
                that.doUpload();
            })
        }
    },

    bindChange:function(ele){
        var that = this;
        ele.bind('change',function(){
            var files = !!this.files ? this.files : [];
            files = this.files;
            if (!files.length || !window.FileReader){
                that.setError(that.getError(5));return;
            }

            if(that.cfg.isMulti){
                if(!that.checkMulti(files.length)){
                    that.setError(that.getError(11));return;
                }
            }

            if(that.cfg.autoSlice && !that.cfg.sliceUploadUrl){
                that.setError(that.getError());return;
            }

            that.setFiles(files);
            if(that.fileObjs.length == 0){
                that.setError(that.getError(9));return;
            }

            that.setFileReader();

            if(that.cfg.autoUpload){
                that.doUpload();
            }
        });
    },

    setFileReader:function () {
        var that = this;
        this.fileObjs.map(function (a,b) {
            if(a.isShow == 0){
                var reader = new FileReader();
                reader.readAsDataURL(a.file);
                reader.onloadend = function(e){
                    if(!that.checkHex(e.target.result)){
                        that.setError(that.getError(7));
                        return;
                    }
                    that.setShow(e.target.result,a.fileExt);
                    that.fileObjs[b].isShow = 1;
                }
            }
        })
    },

    //设置要上传的文件
    setFiles:function(files){
        var that = this;
        var len = files.length;
        for (var i=0;i<len;i++){
            var fileExt = '',fileSize = '',model = 0;
            fileExt = files[i].name.substr(files[i].name.lastIndexOf('.') + 1);
            fileSize = files[i].size;
            if(!that.checkAlow(fileExt)){
                that.setError(that.getError(3));
                continue;
            }
            if(!that.checkSize(fileSize)){
                that.setError(that.getError(4));
                continue;
            }

            model = that.cfg.autoSlice && that.cfg.sliceSize <= fileSize ? 2 : 1;
            var temp = {
                file:files[i],
                model:model,
                fileExt:fileExt,
                fileSize:fileSize,
                status:0,//未上传状态
                isShow:0//未预览状态
            };
            that.fileObjs.push(temp);
        }
        return true;
    },

    //检查文件是否允许上传
    checkAlow:function(fileExt){
        var alowStr = this.cfg.alowType.join();
        if(alowStr.indexOf(fileExt) === -1){
            return false;
        }
        return true;
    },

    //检查文件尺寸是否超出
    checkSize:function(fileSize){
        var alowSize = this.cfg.maxSize;
        if(!fileSize){
            return false;
        }
        if(fileSize > alowSize){
            return false;
        }
        return true;
    },

    //检查是否含有可执行代码
    checkHex:function(data){
        var hexList = this.cfg.hexList;
        var len = hexList.length;
        data = data.length > 512 ? data.substr(0,512) + data.substr(data.length - 512): data;
        for(var i = 0;i < len;i++){
            if(data.indexOf(hexList[i]) !== -1){
                return false;
            }
        }

        //满足条件无法跳出map TODO
        // hexList.map(function(b){
        //     console.log(b);
        //     if(data.indexOf(b) !== false){
        //         console.log(111111111111);
        //         return false;
        //     }

        // })
        return true;
    },

    //设置显示预览图
    setShow:function(url,fileExt){
        if(!url){
            return false;
        }
        this.setPanel();
        var typeStrImage = 'jpg,jpeg,png,gif';
        var typeStrVideo = 'mp4';
        var html = '';
        if(typeStrImage.indexOf(fileExt) !== -1){
            html = '<img src="'+ url +'" width="120px" />';
        }else if(typeStrVideo.indexOf(fileExt) !== -1){
            html = '<video src="'+ url +'" controls height="120">您的浏览器不支持 video 标签。</video>';
        }else{
            html = '该文件类型不支持预览';
        }

        $(this.cfg.imgPanel).append(html)
    },
    setPanel:function(){
        if(!this.cfg.imgPanel){
            $(this).after('<div id="asyn_panel"></div>');
        }
        this.cfg.imgPanel = '#asyn_panel';
    },

    //上传文件
    doUpload:function(){
        var that = this,files = that.fileObjs,processBarName = '';
        if (files.length > 0){
            files.map(function(a,b){
                if(a.status == 0){
                    processBarName = 'process_bar_' + b;
                    that.cfg.process.list[processBarName] = {'t':null,'percentage':0};
                    if(!a.file.size){
                        that.setError(that.getError(9));return;
                    }
                    that.showProcess(processBarName,a.file.name);
                    if(a.model == 1){//普通上传方式
                        that.uploadNormal(a.file,processBarName);
                    }else{//分片上传方式
                        that.uploadSlice(a.file,a.fileExt,processBarName);
                    }
                }
                that.fileObjs[b].status = 1;
            })
        }
    },

    //普通上传
    uploadNormal:function(data,processBarName){
        this.intvalProcess(processBarName);
        var that = this;
        var formData = new FormData();
        formData.append(that.cfg.upField, data);
        $.ajax({
            url: that.cfg.upUrl,
            type: 'POST',
            datatype: 'json',
            data: formData,
            cache:false,
            xhrFields: {
                withCredentials: true
            },
            traditional: true,
            contentType: false,
            processData: false,
            success: function (res) {
                that.processStep(processBarName,100);
                if(that.cfg.callBack && (typeof that.cfg.callBack) == 'function'){
                    that.cfg.callBack(res);
                }
            }
        })
    },

    //分片上传
    uploadSlice:function(file,fileExt,processBarName){
        this.slices.length = 0;
        var that = this,slices = that.sliceFile(file),len = Math.ceil(file.size / this.cfg.sliceSize),blobName = that.getBlobName(8);
        for (var i = 0;i < len;i++){
            var item = slices[i];
            var formData = new FormData();
            formData.append(that.cfg.upField, item.blob);
            formData.append('blobNum',item.blobNum)
            formData.append('blobTotal',len);
            formData.append('blobName',blobName);
            formData.append('suffix',fileExt);
            $.ajax({
                url: that.cfg.sliceUploadUrl,
                type: 'POST',
                datatype: 'json',
                data: formData,
                cache:false,
                xhrFields: {
                    withCredentials: true
                },
                traditional: true,
                contentType: false,
                processData: false,
                success: function (res) {
                    if(res.code == 1){
                        that.cfg.process.list[processBarName].percentage = parseFloat(((i / len) * 100).toFixed(3));
                        that.processStep(processBarName,that.cfg.process.list[processBarName].percentage);
                    }
                    if(res.code == 2){
                        that.cfg.process.list[processBarName].percentage = parseFloat(((i / len) * 100).toFixed(3));
                        that.processStep(processBarName,that.cfg.process.list[processBarName].percentage);
                        if(that.cfg.callBack && (typeof that.cfg.callBack) == 'function'){
                            that.cfg.callBack(res);
                        }
                    }
                }
            })
        }
    },

    //切割文件
    sliceFile:function(file){
        var that = this,thatFile = file,blob = thatFile.slice(that.start,that.end);
        that.start = that.end;
        that.end += that.cfg.sliceSize;
        that.block += 1;

        var temp = {
            blob:blob,
            blobNum:that.block,
        };

        that.slices.push(temp);
        if(that.start < file.size){
            that.sliceFile(file);
        }
        that.start = 0;
        that.end = 0;
        that.block = 0;
        return that.slices;
    },

    //检查多个文件上传文件个数是否超出
    checkMulti:function(len){
        if(len > this.cfg.isMulti){
            return false;
        }
        return true;
    },

    //获取分片名
    getBlobName:function(len,prefix,suffix){
        var hash = ['a','b','c','d','e','f','g','h','i','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z','A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z','0','1','2','3','4','5','6','7','8','9'];
        len = len ? len : 8;
        prefix = prefix ? prefix : '';
        suffix = suffix ? suffix : '';
        var str = prefix;
        for(var i=0;i<len;i++){
            var need = parseInt(Math.random() * (60 + 1));
            str += hash[need];
        }
        str = str + suffix;
        return str;
    },

    showProcess:function(key,fileName){
        if(this.cfg.showProgress){
            $(this).after('<div class="process" id="'+ key +'"><div class="processbar html"><div class="filled" data-width="0%"></div><span class="fname">'+ fileName +' <span class="percent">0%</span></span></div></div>');
        }
    },

    intvalProcess:function(processBarName){
        var Max = this.cfg.process.stepMax,Min = this.cfg.process.stepMin,that = this,rand = 0,p = 0;
        var t = that.cfg.process.list[processBarName].t = setInterval(function(){
            rand = parseInt(Math.random() * (Max - Min + 1) + Min);
            that.cfg.process.list[processBarName].percentage += rand;
            p = that.cfg.process.list[processBarName].percentage;
            if (p >= that.cfg.process.stop){
                that.processStep(processBarName,that.cfg.process.stop);
                clearInterval(t);
            }else{
                that.processStep(processBarName,p);
            }
        },500);
    },

    processStep:function(processBarName,process){
        var p =  $('#' + processBarName);
        if(p.length){
            var width = parseInt(p.find('.processbar').css('width'));
            p.find('.filled').attr('data-width',process + '%').stop().animate({width:parseInt(width * process / 100)});
            p.find('.percent').text(process.toFixed(2) + '%');
            if(process == 100){
                clearInterval(this.cfg.process.list[processBarName].t);
            }
        }
    },

    //输出错误信息
    setError:function(msg){
        this.cfg.status = 0;
        console.log(msg);
    },
    getError:function(k){
        switch (k){
            case 1:
                return "未设置或找不到" + this.cfg.filePanel + '元素';
            break;
            case 2:
                return "未设置文件文件上传路径";
            break;
            case 3:
                return "文件类型错误";
            break;
            case 4:
                return "文件大小超出";
            break;
            case 5:
                return "读取文件流失败";
            break;
            case 6:
                return "文件大小为零";
                break;
            case 7:
                return "文件含有可执行文件";
                break;
            case 8:
                return "请设置手动上传按钮";
                break;
            case 9:
                return "没有可以上传的文件";
                break;
            case 10:
                return "使用分片上传必须设置分片上传地址";
                break;
            case 11:
                return "超出最大上传个数";
                break;
            default:
                return "未知错误";
                break;
        }
    }
});