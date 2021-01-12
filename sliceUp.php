<?php
class Upload{
    private $filepath = './upload'; //上传目录
    private $tmpPath;  //PHP文件临时目录
    private $blobNum; //第几个文件块
    private $totalBlobNum; //文件块总数
    private $fileName; //文件名
    private $suffix; //文件后缀名
    private $code = 0;
    private $evn = 'Linux'; //Linux WIN
    private $handle;

    public function __construct($tmpPath,$blobNum,$totalBlobNum,$fileName,$suffix){
        $this->tmpPath =  $tmpPath;
        $this->fileName =  $fileName;
        $this->blobNum =  intval($blobNum);
        $this->totalBlobNum =  intval($totalBlobNum);
        $this->suffix = $suffix ? '.' . $suffix : '.temp';

        $this->init();
    }

    private function init(){
        session_start();

        $this->checkEnv();

        $this->uploadFlag();
        $this->moveFile();
        $this->modifyUploadFlag();
    }

    //判断是否是最后一块，如果是则进行文件合成并且删除文件块
    private function fileMerge(){
        $mergeFileName = $this->getAbsolutePath() . DIRECTORY_SEPARATOR . $this->fileName . $this->suffix;
        if(!file_exists($mergeFileName)){
            $cmd = $this->getMergeCommand();
            exec($cmd);
            $this->deleteFileBlob();
        }
    }

    //删除文件块
    private function deleteFileBlob(){
        exec($this->getDelCommand());
    }

    //移动文件
    private function moveFile(){
        $this->touchDir();
        move_uploaded_file($this->tmpPath,$this->getBlobName($this->blobNum));
    }

    //API返回数据
    public function apiReturn(){
        $data['code'] = $this->code;
        $data['nowBlob'] = $this->blobNum;
        if($this->code == 2){
            @unlink($this->getFlagFileName());

            $data['msg'] = 'success';
            $data['file_path'] = 'http://'.$_SERVER['HTTP_HOST'] . str_replace('.','',$this->filepath) . DIRECTORY_SEPARATOR . $this->fileName . $this->suffix;
        }else{
            $data['msg'] = 'waiting for all';
            $data['file_path'] = '';
        }
        header('Content-type: application/json;charset=utf-8');
        echo json_encode($data);exit;
    }

    //建立上传文件夹
    private function touchDir(){
        if(!file_exists($this->filepath)){
            return mkdir($this->filepath,755,true);
        }
    }

    private function getBlobName($blobNum) {
        return $this->getAbsolutePath() . DIRECTORY_SEPARATOR . $this->fileName . '__' . $blobNum;
    }

    private function getAbsolutePath(){
        return __DIR__ . DIRECTORY_SEPARATOR . trim($this->filepath,'./');
    }

    private function uploadFlag(){
        $flagFileName = $this->getFlagFileName();
        $this->handle = fopen($flagFileName,'w+');
        flock($this->handle,LOCK_EX);

        if (!isset($_SESSION[$this->getSessionKey()])) {
            $_SESSION[$this->getSessionKey()] = $this->totalBlobNum;
        }
        return;
    }

    private function modifyUploadFlag() {
        $flag = intval($_SESSION[$this->getSessionKey()]) - 1;
        if ($flag == 0) {
            $this->fileMerge();
            $this->code = 2;
        }
        $_SESSION[$this->getSessionKey()] = $flag;
    }

    private function getFlagFileName() {
        return $this->getAbsolutePath() . DIRECTORY_SEPARATOR . $this->fileName . '.flag';
    }

    private function checkEnv(){
        $this->evn = PHP_OS;
    }

    private function getDelCommand(){
        if ($this->evn == 'Linux') {
            $cmd = 'rm -f ';
        }else{
            $cmd = 'del ';
        }
        for($i = 1; $i <= $this->totalBlobNum; $i++){
            $cmd .= $this->getBlobName($i) . ' ';
        }
        return rtrim($cmd,' ');
    }

    private function getMergeCommand(){
        $mergeFileName = $this->getAbsolutePath() . DIRECTORY_SEPARATOR . $this->fileName . $this->suffix;
        if ($this->evn == 'Linux') {
            $cmd = 'cat ';
            for($i = 1; $i <= $this->totalBlobNum; $i++){
                $blobName = $this->getBlobName($i);
                $cmd .= $blobName . ' ';
            }
            $cmd .= '>' . $mergeFileName;
        }else{
            $cmd = 'copy /B ';
            for($i = 1; $i <= $this->totalBlobNum; $i++){
                $blobName = $this->getBlobName($i);
                $cmd .= $blobName . '+';
            }
            $cmd = rtrim($cmd,'+') . ' ' . $mergeFileName;
        }
        return $cmd;
    }

    private function getSessionKey(){
        return 'async_' . $this->fileName;
    }

    public function __destruct()
    {
        @fclose($this->handle);
    }
}

//实例化并获取系统变量传参
$upload = new Upload($_FILES['file']['tmp_name'],$_POST['blobNum'],$_POST['blobTotal'],$_POST['blobName'],$_POST['suffix']);
//调用方法，返回结果
$upload->apiReturn();