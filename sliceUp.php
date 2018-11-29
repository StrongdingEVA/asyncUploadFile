<?php
class Upload{
    private $filepath = './upload'; //上传目录
    private $tmpPath;  //PHP文件临时目录
    private $blobNum; //第几个文件块
    private $totalBlobNum; //文件块总数
    private $fileName; //文件名

    public function __construct($tmpPath,$blobNum,$totalBlobNum,$fileName,$suffix){
        $this->tmpPath =  $tmpPath;
        $this->blobNum =  $blobNum;
        $this->totalBlobNum =  $totalBlobNum;
        $this->fileName =  $fileName;
        $this->suffix = $suffix ? '.' . $suffix : '.temp';

        $this->moveFile();
        if($this->checkBlock()){
            $this->fileMerge();
        }
    }

    //判断是否是最后一块，如果是则进行文件合成并且删除文件块
    private function fileMerge(){
        if(!file_exists($this->filepath.'/'. $this->fileName . $this->suffix)){
            ini_set('memory_limit','500M');
            $blob = '';
            for($i=1; $i<= $this->totalBlobNum; $i++){
                $blob .= file_get_contents($this->filepath.'/'. $this->fileName.'__'.$i);
            }
            file_put_contents($this->filepath.'/'. $this->fileName . $this->suffix,$blob);
            $this->deleteFileBlob();
        }else{
            $this->deleteFileBlob();
        }
    }

    private function checkBlock(){
        for($i=1; $i<= $this->totalBlobNum; $i++){
            if(!file_exists($this->filepath.'/'. $this->fileName.'__'.$i)){
                return false;
            }
        }
        return true;
    }

    //删除文件块
    private function deleteFileBlob(){
        for($i=1; $i<= $this->totalBlobNum; $i++){
            @unlink($this->filepath.'/'. $this->fileName.'__'.$i);
        }
    }

    //移动文件
    private function moveFile(){
        $this->touchDir();
        $filename = $this->filepath.'/'. $this->fileName.'__'.$this->blobNum;
        move_uploaded_file($this->tmpPath,$filename);
    }

    //API返回数据
    public function apiReturn(){
        $data['code'] = 0;
        if($this->blobNum == $this->totalBlobNum){
//            if(file_exists($this->filepath.'/'. $this->fileName . $this->suffix)){
            //这里不判断合并后的文件是否存在，因为在所有分包请求都到达服务器的情况下
            //比如说有30个分包  请求29和请求30同时到达 这时候请求29判断所有分包都已经
            //到达 开始合并分包 然而请求30在这里判断合并后的文件是否存在会出现问题，（
            //因为合并过程可能会比较长,判断可能会返回false的情况)
                $data['code'] = 2;
                $data['msg'] = 'success';
                $data['file_path'] = 'http://'.$_SERVER['HTTP_HOST'] . str_replace('.','',$this->filepath).'/'. $this->fileName . $this->suffix;
//            }
        }else{
            if(file_exists($this->filepath.'/'. $this->fileName.'__'.$this->blobNum)){
                $data['code'] = 1;
                $data['msg'] = 'waiting for all';
                $data['file_path'] = '';
            }
        }
        header('Content-type: application/json');
        echo json_encode($data);
    }

    //建立上传文件夹
    private function touchDir(){
        if(!file_exists($this->filepath)){
            return mkdir($this->filepath,755,true);
        }
    }
}

//实例化并获取系统变量传参
$upload = new Upload($_FILES['file']['tmp_name'],$_POST['blobNum'],$_POST['blobTotal'],$_POST['blobName'],$_POST['suffix']);
//调用方法，返回结果
$upload->apiReturn();