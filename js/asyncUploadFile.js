jQuery.fn.extend({
    asyncUpload:function(cfg){
        var cfg = cfg;
        this.cfg = {};
        this.cfg.filePanel = cfg.filePanel; //
        this.cfg.btnFile = cfg.btnFile || ""; //文件域选择器
        this.cfg.upField = cfg.upField || "file"; //文件域名称
        this.cfg.autoUpload = cfg.autoUpload || true; //默认开启自动上传
        this.cfg.alowType = cfg.alowType || ["jpg","jpeg","gif","png"]; //默认允许文件后缀
        this.cfg.maxSize = cfg.maxSize || 1024 * 1024 * 2; //默认最大上传尺寸2M
        this.cfg.imgPanel = cfg.imgPanel || ""; //盛放image的容器
        this.cfg.cliText = cfg.cliText || "点击上传"; //未开启自动上传时 生成的按钮的文字
        this.cfg.maxLen = cfg.maxLen || 1; //默认允许最多上传文件个数
        this.cfg.upUrl = cfg.upUrl || ''; //文件上传路径
        this.cfg.callBack = cfg.callBack || {};
        this.cfg.files = [];

        this.cfg.status = 1;
        this.cfg.fileSize = 0;
        this.cfg.fileExt = '';
        this.cfg.hexList = ['PD9waHA','PHNjcmlwdD4'];
        // 'PD9waHA=' === '<?php'
        // 'PHNjcmlwdD4=' ==== '<script>'

        this.check(this);
    },
    check: function(cfg) {
        if(!cfg.btnFile){
            this.setError(this.getError(1));return;
        }else if(!cfg.upUrl){
            this.setError(this.getError(2));return;
        }else if(!cfg.filePanel){
            this.setError(this.getError(2));return;
        }
        console.log(this.cfg);
        var that = this;
        $(cfg.filePanel).bind('click',function(){
            var inp = $('<input type="file" style="display:none">')
            $(this).after(inp);
            inp.bind('change',that.bindChange);
            // inp.bind('change',function(){
            //     var files = !!this.files ? this.files : [];
            //     if (!files.length || !window.FileReader){
            //         that.setError(that.getError(5));return;
            //     }
            //     files = files[0];
            //     that.cfg.fileExt = files.name.substr(files.name.indexOf('.') + 1)
            //     that.cfg.files.push(files);
            //     that.cfg.fileSize = files.size;

            //     if(!that.checkAlow()){
            //         that.setError(that.getError(3));return;
            //     }
            //     var ckSize = that.checkSize();

            //     if((typeof ckSize) != "boolean"){
            //         that.setError(that.getError(ckSize));return;
            //     }

            //     if (/^image/.test(files.type)){
            //         var reader = new FileReader();
            //         reader.readAsDataURL(files);
            //         reader.onloadend = function(){
            //             if(!that.checkHex(this.result)){
            //                 that.setError(that.getError(7));return;
            //             }
            //             that.setImg(this.result);
            //         }
            //         if(that.cfg.autoUpload){
            //             that.doUpload();
            //         }
            //     }else{
            //         that.setError(that.getError(3));return;
            //     }
            // })

            inp.click();
        })
    },

    bindChange:function(e){
        var that = this;console.log(this);
        var files = !!e.currentTarget.files ? e.currentTarget.files : [];
        if (!files.length || !window.FileReader){
            that.setError(that.getError(5));return;
        }
        files = files[0];
        that.cfg.fileExt = files.name.substr(files.name.indexOf('.') + 1)
        that.cfg.files.push(files);
        that.cfg.fileSize = files.size;

        if(!that.checkAlow()){
            that.setError(that.getError(3));return;
        }
        var ckSize = that.checkSize();

        if((typeof ckSize) != "boolean"){
            that.setError(that.getError(ckSize));return;
        }

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
            $(this).after('<div id="panel"></div>');
        }
        this.cfg.imgPanel = '#panel';
    },

    //上传文件
    doUpload:function(){
        var that = this;
        that.cfg.files.map(function(a){
            var formData = new FormData();
            formData.append(that.cfg.upField, a);
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
        })
    },

    //输出错误信息
    setError:function(msg){
        this.cfg.status = 0;
        console.log(msg);
    },
    getError:function(k){
        switch (k){
            case 1:
                return "未设置文件域";
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
        }
    }
});
