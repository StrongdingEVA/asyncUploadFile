<?php
/**
 * Created by PhpStorm.
 * User: Administrator
 * Date: 2018/4/26 0026
 * Time: 9:13
 */
class TestAutoLoad{
    public $name = '';
    public function __construct($name){
        $this->name = $name ? $name : 'dingwenqiang';
    }

    public function getName(){
        return $this->name;
    }
}
