jQuery.fn.extend({
    asyncUpload:function(cfg){
        var cfg = cfg;
        this.cfg = {};
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

        this.check(this.cfg);
    },
    check: function(cfg) {
        if(!cfg.btnFile){
            this.setError(this.getError(1));return;
        }else if(!cfg.upUrl){
            this.setError(this.getError(2));return;
        }
        var that = this;
        $(cfg.btnFile).change(function(){
            var files = !!this.files ? this.files : [];
            if (!files.length || !window.FileReader){
                that.setError(that.getError(5));return;
            }
            files = files[0];
            console.log(files);
            that.cfg.fileExt = files.name.substr(files.name.indexOf('.') + 1)
            that.cfg.files.push(files);
            that.cfg.fileSize = files.size;

            if(!that.checkAlow()){
                that.setError(that.getError(3));return;
            }


            if (/^image/.test(files.type)){
                var reader = new FileReader();
                reader.readAsDataURL(files);
                reader.onloadend = function(){
                    that.setImg(this.result);
                }
                if(that.cfg.autoUpload){
                    that.doUpload();
                }
            }else{
                that.setError(that.getError(3));return;
            }
        })
    },
    checkAlow:function(){
        var alowStr = this.cfg.alowType.join();
        if(alowStr.indexOf(this.cfg.fileExt) === false){
            return false;
        }
        return true;
    },
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
        }
    }
});
