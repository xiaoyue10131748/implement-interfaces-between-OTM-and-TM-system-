// CONTAINER_RETURN_BILL  空容器返回接口   4.10
common.SCMP_INBOUNDS['CONTAINER_RETURN_BILL'] = function($, reqHeader, reqBody, contentObj, logObj) {
  var it = contentObj.iterator()
  while (it.hasNext()) { // HEADER loop
    var obj = it.next()
    print("=======obj" + obj)
    var return_box_bill_code = obj.get('RETURN_BOX_BILL_CODE') // 返空单号
    var car_no = obj.get('CAR_NO') // 车牌号
    var driver_code = obj.get('DRIVER_CODE') //司机编码
    var driver_name = obj.get('DRIVER_NAME') // 司机姓名
    var return_type = obj.get('RETURN_TYPR') //返空方式
    var has_auxiliary = obj.get('HAS_AUXILIARY').asText() // 有无辅材
    print("=============testXY"+has_auxiliary)
if (has_auxiliary=='false'){
  has_auxiliary=0
}
else has_auxiliary=1

    print("=============testXYXY"+has_auxiliary)

    var storage_type = obj.get('STORAGE_TYPE') //
    var storage_code = obj.get('STORAGE_CODE') //仓库编码
    var scaner = obj.get('SCANER') // 扫描人编码
    var issue_emp = obj.get('ISSUE_EMP') // 发行人
    var issue_time = obj.get('ISSUE_TIME') // 发行时间
    var container_detail_list = obj.get('CONTAINER_DETAIL_LIST') //容器明细
    var insert_user = "\"" + "ADMIN" + "\""
    //获取最大ID
    ls_maxid_sql = "select NCS_INFO_CONTAINER_R_BILL_SEQ.NEXTVAL AS ID from  dual"
    var rows = $.jdbcTemplate.queryForList(ls_maxid_sql);
    var li_in_storage_maxid = rows[0].ID;

    var containerList = container_detail_list.iterator()

    while (containerList.hasNext()) { //取出数组里的值拼成字符串
      var ctIt = containerList.next()
      var need_goods_code = ctIt.get('NEED_GOODS_CODE')
      var supplier_code = ctIt.get('SUPPLIER_CODE')
      var send_place_code = ctIt.get('SEND_PLACE_CODE')
      var container_label_code = ctIt.get('CONTAINER_LABEL_CODE')
      var plate_qty = ctIt.get('PLATE_QTY')
      var shelf_qty = ctIt.get('SHELF_QTY')
      var box_qty = ctIt.get('BOX_QTY')

      // 插入明细
      var insert_storage_details_sql = "insert into NCS_INFO_CONTAINER_R_DETAILS(ID,CONTAINER_ID,NEED_GOODS_CODE,SUPPLIER_CODE,SEND_PLACE_CODE,CONTAINER_LABEL_CODE,PLATE_QTY,SHELF_QTY ,BOX_QTY,Insert_User,Insert_Date)" +
        "values (NCS_INFO_CONTAINER_R_D_SEQ.NEXTVAL," + li_in_storage_maxid + "," + need_goods_code + "," + supplier_code + "," + send_place_code + ","+ container_label_code + "," + plate_qty + "," + shelf_qty + "," + box_qty + ","  + insert_user + " , SYSDATE  )"
      insert_storage_details_sql = insert_storage_details_sql.replaceAll("\"", "\'") //将双引号变成单引号
      try {
        $.doInTransactionWithoutResult(function() {
          print("=======insert_storage_details_sql" + insert_storage_details_sql)
          $.jdbcTemplate.update(insert_storage_details_sql)
        });
      } catch (e) {
        e = common.throwable(e)
        e.printStackTrace()
      }
    }



      var insert_storage_sql = "insert into NCS_INFO_CONTAINER_RETURN_BILL (ID,RETURN_BOX_BILL_CODE,CAR_NO,DRIVER_CODE,DRIVER_NAME,RETURN_TYPE,HAS_AUXILIARY,STORAGE_TYPE,STORAGE_CODE,SCANER,ISSUE_EMP,ISSUE_TIME,INSERT_USER,Insert_Date)  " +
        "values (" + li_in_storage_maxid + "," + return_box_bill_code + "," + car_no + "," + driver_code + "," + driver_name + "," + return_type + "," + has_auxiliary + ","+ storage_type +","+ storage_code + "," + scaner + ","+ issue_emp + ","+ issue_time +"," + insert_user + " ,  SYSDATE  )"
      insert_storage_sql = insert_storage_sql.replaceAll("\"", "\'") //将双引号变成单引号
      try {
        $.doInTransactionWithoutResult(function() {
          print("=======insert_storage_sql" + insert_storage_sql)
          $.jdbcTemplate.update(insert_storage_sql)
        });
      } catch (e) {
        e = common.throwable(e)
        e.printStackTrace()
      }



    }


  return common.scmpCreateResponse(reqHeader, reqBody, '0', 'OK')
}
