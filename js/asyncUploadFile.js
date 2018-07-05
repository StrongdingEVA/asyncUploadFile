jQuery.fn.extend({
    asyncUpload:function(cfg){
        var cfg = cfg;
        this.cfg = {};
        this.cfg.filePanel = cfg.filePanel; //文件域选择器
        this.cfg.upField = cfg.upField || "file"; //文件域名称
        this.cfg.autoUpload = cfg.autoUpload == false ? cfg.autoUpload : true; //默认开启自动上传
        this.cfg.alowType = cfg.alowType || ["jpg","jpeg","gif","png","mp4"]; //默认允许文件后缀
        this.cfg.maxSize = cfg.maxSize || 1024 * 1024 * 100; //默认最大上传尺寸2M
        this.cfg.imgPanel = cfg.imgPanel || ""; //盛放image的容器
        this.cfg.cliText = cfg.cliText || "点击上传"; //未开启自动上传时 生成的按钮的文字
        this.cfg.cliBtn = cfg.cliBtn || ''; //手动点击按钮
        this.cfg.maxLen = cfg.maxLen || 1; //默认允许最多上传文件个数
        this.cfg.upUrl = cfg.upUrl || ''; //文件上传路径

        this.cfg.autoSlice = cfg.autoSlice == false ? cfg.autoSlice : true;
        this.cfg.modelLimt = 1024 * 1024 * 5; //文件大于这个尺寸使用分片上传
        this.cfg.sliceSize = 1024 * 1024; //每片大小
        this.cfg.model = cfg.model || 1; //文件上传方式 1普通上传 2 分片上传
        this.cfg.callBack = cfg.callBack || {};
        this.cfg.sliceUploadUrl = cfg.sliceUploadUrl || '';

        this.cfg.status = 1;
        this.cfg.fileSize = 0;
        this.cfg.fileExt = '';
        this.cfg.hexList = ['PD9waHA','PHNjcmlwdD4'];
        // 'PD9waHA=' === '<?php'
        // 'PHNjcmlwdD4=' ==== '<script>'
        this.end = this.start + this.cfg.sliceSize;
        this._init(this.cfg);
    },
    files : [],
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
            var inp = $('<input type="file" style="display:none">');
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
            files = files[0];
            that.cfg.fileExt = files.name.substr(files.name.indexOf('.') + 1)
            that.cfg.fileSize = files.size;
            if(!that.checkAlow()){
                that.setError(that.getError(3));return;
            }
            var ckSize = that.checkSize();

            if((typeof ckSize) != "boolean"){
                that.setError(that.getError(ckSize));return;
            }
            var temp = {
                file:files
            }

            if(that.cfg.autoSlice && !that.cfg.sliceUploadUrl){
                that.setError(that.getError());return;
            }
            // console.log(that.cfg.autoSlice,files.size,that.cfg.sliceSize);return;
            if(that.cfg.autoSlice && that.cfg.sliceSize <= files.size){ //如果开启分片上传  并且文件大小达到要求 使用分片上传
                temp.model = 2;
            }else{
                temp.model = 1;
            }
            that.files.push(temp);

            var reader = new FileReader();
            reader.readAsDataURL(files);
            reader.onloadend = function(){
                if(!that.checkHex(this.result)){
                    that.setError(that.getError(7));return;
                }
                that.setShow(this.result);
            }
            if(that.cfg.autoUpload){
                that.doUpload();
            }
        });
    },

    //检查文件是否允许上传
    checkAlow:function(){
        var alowStr = this.cfg.alowType.join();
        if(alowStr.indexOf(this.cfg.fileExt) === -1){
            return false;
        }
        return true;
    },

    //检查文件尺寸是否超出
    checkSize:function(){
        var alowSize = this.cfg.maxSize;
        var fileSize = this.cfg.fileSize;
        if(!fileSize){
            return 6;
        }
        if(fileSize > alowSize){
            return 4;
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
    setShow:function(url){
        if(!url){
            return false;
        }
        this.setPanel();
        var typeStrImage = 'jpg,jpeg,png,gif';
        var typeStrVideo = 'mp4';
        var html = '';
        if(typeStrImage.indexOf(this.cfg.fileExt) !== -1){
            html = '<img src="'+ url +'" width="120px" />';
        }else if(typeStrVideo.indexOf(this.cfg.fileExt) !== -1){
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
        var that = this;
        var files = that.files;
        files.map(function(a){
            if(!a.file.size){
                that.setError(that.getError(9));return;
            }
            if(a.model == 1){//普通上传方式
                that.uploadNormal(a.file);
            }else{//分片上传方式
                that.uploadSlice(a.file);
            }
        })
    },

    //普通上传
    uploadNormal:function(data){
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
                if(that.cfg.callBack && (typeof that.cfg.callBack) == 'function'){
                    that.cfg.callBack(res);
                }
            }
        })
    },

    //分片上传
    uploadSlice:function(file){
        var slices = slices = this.sliceFile(file);
        var that = this;
        var len = Math.ceil(file.size / this.cfg.sliceSize);
        var blobName = that.getBlobName(8);
        slices.map(function(item){
            var formData = new FormData();
            formData.append(that.cfg.upField, item.blob);
            formData.append('blobNum',item.blobNum)
            formData.append('blobTotal',len);
            formData.append('blobName',blobName);
            formData.append('suffix',that.cfg.fileExt)
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
                    console.log(res);
                }
            })
        })
    },

    //切割文件
    sliceFile:function(file){
        var that = this;
        var thatFile = file;
        var blob = thatFile.slice(that.start,that.end);
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
        that.end = that.start + that.cfg.sliceSize;
        return that.slices;
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
        str = str + suffix;console.log(str);
        return str;
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
            default:
                return "未知错误";
                break;
        }
    }
});

