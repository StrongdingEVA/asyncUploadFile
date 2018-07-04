jQuery.fn.extend({
    asyncUpload:function(cfg){
        var cfg = cfg;
        this.cfg = {};
        this.cfg.filePanel = cfg.filePanel; //文件域选择器
        this.cfg.upField = cfg.upField || "file"; //文件域名称
        this.cfg.autoUpload = cfg.autoUpload == false ? cfg.autoUpload : true; //默认开启自动上传
        this.cfg.alowType = cfg.alowType || ["jpg","jpeg","gif","png"]; //默认允许文件后缀
        this.cfg.maxSize = cfg.maxSize || 1024 * 1024 * 2; //默认最大上传尺寸2M
        this.cfg.imgPanel = cfg.imgPanel || ""; //盛放image的容器
        this.cfg.cliText = cfg.cliText || "点击上传"; //未开启自动上传时 生成的按钮的文字
        this.cfg.cliBtn = cfg.cliBtn || ''; //手动点击按钮
        this.cfg.maxLen = cfg.maxLen || 1; //默认允许最多上传文件个数
        this.cfg.upUrl = cfg.upUrl || ''; //文件上传路径

        this.cfg.autoSlice = cfg.autoSlice == false ? cfg.autoSlice : true;
        this.cfg.modelLimt = 1024 * 1024 * 8; //文件大于这个尺寸使用分片上传
        this.cfg.sliceSize = 1024 * 1024; //没片大小
        this.cfg.model = cfg.model || 1; //文件上传方式 1普通上传 2 分片上传
        this.cfg.callBack = cfg.callBack || {};
        this.cfg.files = [];

        this.cfg.status = 1;
        this.cfg.fileSize = 0;
        this.cfg.fileExt = '';
        this.cfg.hexList = ['PD9waHA','PHNjcmlwdD4'];
        // 'PD9waHA=' === '<?php'
        // 'PHNjcmlwdD4=' ==== '<script>'

        this._init(this.cfg);
    },
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

            if(that.cfg.autoSlice && that.cfg.sliceSize <= files.size){ //如果开启分片上传  并且文件大小达到要求 使用分片上传
                temp.model = 2;
            }else{
                temp.model = 1;
            }
            that.cfg.files.push(temp);

            if (/^image/.test(files.type)){
                var reader = new FileReader();
                reader.readAsDataURL(files);
                reader.onloadend = function(){
                    if(!that.checkHex(this.result)){
                        that.setError(that.getError(7));return;
                    }
                    that.setImg(this.result);
                }
                if(that.cfg.autoUpload){
                    that.doUpload();
                }
            }else{
                that.setError(that.getError(3));return;
            }
        });
    },

    //检查文件是否允许上传
    checkAlow:function(){
        var alowStr = this.cfg.alowType.join();
        if(alowStr.indexOf(this.cfg.fileExt) === false){
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
    setImg:function(url){
        if(!url){
            return false;
        }
        this.setPanel();
        $(this.cfg.imgPanel).append('<img src="'+ url +'" width="120px" />')
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
        var files = that.cfg.files;
        files.map(function(a){
            if(!a.file.size){
                that.setError(that.getError(9));return;
            }
            if(a.model == 1){//普通上传方式
                that.uploadNormal(a.file);
            }else{//分片上传方式
                that.uploadSlice();
            }
        })
    },

    //普通上传
    uploadNormal:function(data){
        var taht = this;
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

    uploadSlice:function(){
        this.sliceFile();
    },

    //切割文件
    sliceFile:function(file){
        var files = sliceFile._do(file);
        console.log(files);
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
        }
    }
});

function alert_js(cfg) {
    this.cfg = $.extend({
        sliceSize = 1024 * 1024; //每片大小
        start = 0;
        end = cfg.start + cfg.sliceSize;
        block = 0;
        file = '';
        flies = [];
    }, cfg);
    this.cfg.loading = false;
    var cfg = this.cfg;
    this.sliceFile();
    var sliceFile = function(){
        var that = this;
        this.cfg.file = file;
        var blob = file.slice(that.cfg.start,that.cfg.end);
        that.cfg.start += end;
        //end = start + LENGTH;
        that.cfg.flies.push(blob);
        that.cfg.block += 1;
        if(that.cfg.start < file.size){
            that._do(file);
        }
        return that.files;
    }
}
jQuery.fn.extend({
    sliceFile:function(){
        this.cfg.sliceSize = 1024 * 1024; //每片大小
        this.cfg.start = 0;
        this.cfg.end = this.cfg.start + this.cfg.sliceSize;
        this.cfg.block = 0;
        this.cfg.file = '';
        this.cfg.flies = [];
    },
    _do: function(file) {
        var that = this;
        this.cfg.file = file;
        var blob = file.slice(that.cfg.start,that.cfg.end);
        that.cfg.start += end;
        //end = start + LENGTH;
        that.cfg.flies.push(blob);
        that.cfg.block += 1;
        if(that.cfg.start < file.size){
            that._do(file);
        }
        return that.files;
    },
});

