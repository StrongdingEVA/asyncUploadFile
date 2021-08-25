jQuery.fn.extend({
    asyncUpload: function (cfg) {
        var cfg = cfg;
        this.cfg = {};
        this.cfg.url              = cfg.url || ''; //文件上传路径
        this.cfg.button           = cfg.button || ''; //手动点击按钮
        this.cfg.maxLen           = cfg.maxLen || 1; //默认允许最多上传文件个数
        this.cfg.isPreview        = cfg.isPreview || true; //是否开启预览
        this.cfg.fileField        = cfg.fileField || "file"; //文件域名称
        this.cfg.pattern          = cfg.pattern || 1; //文件上传方式 1普通上传 2 分片上传
        this.cfg.maxSize          = cfg.maxSize || 1024 * 1024 * 5; //默认最大上传尺寸5M
        this.cfg.previewContainer = cfg.previewContainer || false; //预览文件的容器
        this.cfg.buttonText       = cfg.buttonText || "点击上传"; //未开启自动上传时 生成的按钮的文字
        this.cfg.alowList         = cfg.alowList || ["jpg", "jpeg", "gif", "png"]; //默认允许文件后缀
        this.cfg.isAutoUpload     = cfg.isAutoUpload == false ? cfg.isAutoUpload : true; //默认开启自动上传

        //上传接口状态码字段和上传成功字段值
        this.cfg.statusField        = cfg.statusField || 'code';
        this.cfg.statusSuccessValue = cfg.statusSuccessValue || 1;

        //回调 
        this.cfg.success            = cfg.success || {};
        this.cfg.fail               = cfg.fail || {},

        //分片上次相关 TODO 
        // this.cfg.autoSlice          = cfg.autoSlice == false ? cfg.autoSlice : true;
        // this.cfg.modelLimt          = cfg.modelLimt || 1024 * 1024 * 20; //文件大于这个尺寸使用分片上传
        // this.cfg.sliceSize          = cfg.sliceSize || 1024 * 1024 * 20; //每片大小
        // this.cfg.sliceUploadUrl     = cfg.sliceUploadUrl || '';

        //进度条相关
        // this.cfg.showProgress = cfg.showProgress || true;
        // this.cfg.processName = cfg.processName;
        // this.cfg.process = {
        //     percentage: 0,
        //     stepMin: 5,
        //     stepMax: 20,
        //     stop: 98,
        //     list: {}
        // };

        this._init(this.cfg);
    },

    //文件域选择器
    filePanel: null,
    status: true,
    //错误信息
    error: null,
    //要上传的文件
    fileObjs: [],
    //存放文件分片
    slices: {},

    //初始化
    _init: function (cfg) {
        //绑定元素
        this.bindElement();

        //检查一通
        if (!this.checkCfg()) {
            return this.showError();
        }

        //为元素绑定点击事件
        var that = this;
        $(this.filePanel).bind('click', function () {
            var input = $('<input type="file" multiple style="display:none">');
            $(this).after(input);
            that.bindChange(input);
            input.click();
        })

        //为上传按钮绑定点击事件
        if (cfg.isAutoUpload === false) {
            $(cfg.button).bind('click', function () {
                that.doUpload();
            })
        }
    },

    //检查配置文件配置项
    checkCfg: function () {
        if (!this.cfg.url) {
            return this.setError('未设置上传路径');
        }

        if (this.cfg.isAutoUpload == false) {
            if (typeof this.cfg.button == 'undefined' || $(this.cfg.button).length == 0) {
                return this.setError('未设置或者未找到上传按钮');
            }
        }

        if (typeof this.filePanel == null || $(this.filePanel).length == 0) {
            return this.setError('未设置或者未找到文件域');
        }

        if (typeof this.cfg.fail != 'function') {
            return this.setError('未设置失败回调');
        }

        if (typeof this.cfg.success != 'function') {
            return this.setError('未设置成功回调');
        }

        return true;
    },

    setError: function (msg) {
        this.error = msg;
        return false;
    },

    showError: function () {
        if (this.error != null) {
            if (typeof this.cfg.fail == 'function') {
                this.cfg.fail(this.error);
            } else {
                alert(this.error);
            }
        }
        this.error = null;
    },

    bindElement: function () {
        this.filePanel = '#' + $(this[0]).attr('id');
    },

    // 绑定选中文件后的事件
    bindChange: function (ele) {
        var that = this;
        ele.bind('change', function () {
            var files = !!this.files ? this.files : [];

            if (that.checkUploadBefore(files) == false) {
                return that.showError();
            }

            that.setFiles(files);
            if (that.cfg.isAutoUpload == true) {
                if (that.doUpload() == false) {
                    return that.showError();
                }
            } else {
                // 显示选中的文件名 TODO
            }
        });
    },

    // 上传前检查
    checkUploadBefore: function (files) {
        if (!this.lenCheck(files)) {
            return false;
        }

        if (!this.checkAlow(files)) {
            return false;
        }

        if (!this.checkSize(files)) {
            return false;
        }

        return true;
    },

    lenCheck: function (files) {
        if (!files.length || !window.FileReader) {
            return this.setError('读取文件失败');
        }

        if (files.length > this.cfg.maxLen) {
            return this.setError('最多同时上传' + this.cfg.maxLen + '个文件');
        }
        
        return true;
    },

    //检查文件是否允许上传
    checkAlow: function (files) {
        for (var i = 0; i < files.length; i++) {
            var alowSuffixs = this.cfg.alowList;
            var suffix = files[i].name.substr(files[i].name.lastIndexOf('.') + 1);
            if ($.inArray(suffix, alowSuffixs) == -1) {
                return this.setError('文件格式不允许：' + suffix);
            }
        }

        return true;
    },

    //检查文件尺寸是否超出
    checkSize: function (files) {
        for (var i = 0; i < files.length; i++) {
            var size = files[i].size;
            if (size > this.cfg.maxSize) {
                return this.setError('文件尺寸超出限制');
            }
        }

        return true;
    },

    //上传文件预览
    filePreview: function (index) {
        var that = this;
        that.setPanel();
        var file = that.fileObjs[index];
        if (file.isShow == false) {
            if ("jpg,jpeg,png,gif,mp4".indexOf(file.suffix) !== -1) {
                var reader = new FileReader();
                reader.readAsDataURL(file.file);
                reader.onloadend = function (e) {
                    that.setShow(e.target.result, file.suffix);
                    that.fileObjs[index].isShow = true;
                }
            } else {
                $(that.cfg.previewContainer).append("文件：" + file.file.name + "不支持预览");
            }
        }
    },

    //设置要上传的文件
    setFiles: function (files) {
        var that = this;
        var len = files.length;
        for (var i = 0; i < len; i++) {
            var suffix = '', model = 1;
            suffix = files[i].name.substr(files[i].name.lastIndexOf('.') + 1);

            var temp = {
                file: files[i],
                model: model,
                suffix: suffix,
                fileSize: files[i].size,
                status: false,//未上传状态
                isShow: false//未预览状态
            };
            that.fileObjs.push(temp);
        }

        return true;
    },

    //设置显示预览图
    setShow: function (url, suffix) {
        if (!url) {
            return false;
        }
        var typeStrImage = 'jpg,jpeg,png,gif';
        var typeStrVideo = 'mp4';
        var html = '';
        if (typeStrImage.indexOf(suffix) !== -1) {
            html = '<img src="' + url + '" width="120px" />';
        } else if (typeStrVideo.indexOf(suffix) !== -1) {
            html = '<video src="' + url + '" controls height="120">您的浏览器不支持 video 标签。</video>';
        } else {
            html = '该文件类型不支持预览';
        }

        $(this.cfg.previewContainer).append(html)
    },

    setPanel: function () {
        if (!this.cfg.previewContainer) {
            $(this).after('<div id="asyn_panel"></div>');
        }
        this.cfg.previewContainer = '#asyn_panel';
    },

    //上传文件
    doUpload: function () {
        var that = this,
            files = that.fileObjs;

        if (that.status == true) {
            that.status = false;
            files.map(function (file, index) {
                if (file.status == false) {
                    if (file.model == 1) {//普通上传方式
                        that.uploadNormal(file.file, index);
                    } else {//分片上传方式
                        that.slices[file.file.name] = {
                            start: 0,
                            end: that.cfg.sliceSize,
                            block: 0,
                            blobs: []
                        }
                        that.uploadSlice(file);
                    }
                }
                that.fileObjs[index].status = true;
            })
            that.status = true;
            return true;
        } else {
            return this.setError('还有文件正在上传，请稍候操作');
        }
    },

    //普通上传
    uploadNormal: function (data, index) {
        var that = this;
        var formData = new FormData();
        formData.append(that.cfg.fileField, data);
        $.ajax({
            url: that.cfg.url,
            type: 'POST',
            datatype: 'json',
            data: formData,
            cache: false,
            xhrFields: {
                withCredentials: true
            },
            async: false,
            traditional: true,
            contentType: false,
            processData: false,
            success: function (res) {
                res = eval('(' + res + ')');
                if (res[that.cfg.statusField] == that.cfg.statusSuccessValue) {
                    that.filePreview(index);
                }

                if (typeof that.cfg.success == 'function') {
                    that.cfg.success(res);
                }
            },
            fail: function (res) {
                if (typeof that.cfg.fail == 'function') {
                    that.cfg.fail(res);
                }
            }
        })
    },

    //分片上传
    uploadSlice: function (fileInfo, processBarName) {
        var that = this, len = Math.ceil(fileInfo.file.size / this.cfg.sliceSize), blobName = that.getBlobName(8), j = 0, i = 0, t = 0, slices = [];
        that.sliceFile(fileInfo.file);
        slices = that.slices[fileInfo.file.name].blobs;
        for (var i = 0; i < len; i++) {
            var item = slices[i];
            var formData = new FormData();
            formData.append(that.cfg.fileField, item.blob);
            formData.append('blobNum', item.blobNum);
            formData.append('blobTotal', len);
            formData.append('blobName', blobName);
            formData.append('suffix', fileInfo.suffix);
            $.ajax({
                url: that.cfg.sliceUploadUrl,
                type: 'POST',
                datatype: 'json',
                data: formData,
                cache: false,
                xhrFields: {
                    withCredentials: true
                },
                traditional: true,
                contentType: false,
                processData: false,
                // async:false,
                success: function (res) {
                    if (res.code >= 0) {
                        j++;
                        that.cfg.process.list[processBarName].percentage = parseFloat(((j / len) * 100).toFixed(3));
                        that.processStep(processBarName, that.cfg.process.list[processBarName].percentage);

                        if (res.code == 2) {
                            that.status = true;
                            if (that.cfg.callBack && (typeof that.cfg.callBack) == 'function') {
                                that.cfg.callBack(res);
                            }
                        }
                    }
                }
            })
        }
    },

    //切割文件
    sliceFile: function (file) {
        var that = this, thatFile = file, blob = thatFile.slice(that.slices[file.name].start, that.slices[file.name].end);
        that.slices[file.name].start = that.slices[file.name].end;
        that.slices[file.name].end += that.cfg.sliceSize;
        that.slices[file.name].block += 1;

        var temp = {
            blob: blob,
            blobNum: that.slices[file.name].block,
        };
        that.slices[file.name].blobs.push(temp);
        if (that.slices[file.name].start < file.size) {
            that.sliceFile(file);
        }
    },

    //获取分片名
    getBlobName: function (len, prefix, suffix) {
        var hash = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
        len = len ? len : 8;
        prefix = prefix ? prefix : '';
        suffix = suffix ? suffix : '';
        var str = prefix;
        for (var i = 0; i < len; i++) {
            var need = parseInt(Math.random() * 61);
            str += hash[need];
        }
        str = str + suffix;
        return str;
    }
});