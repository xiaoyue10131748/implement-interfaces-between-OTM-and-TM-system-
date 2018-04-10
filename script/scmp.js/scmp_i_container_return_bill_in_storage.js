// CONTAINER_RETURN_BILL_IN_STORAGE
common.SCMP_INBOUNDS['CONTAINER_RETURN_BILL_IN_STORAGE'] = function($, reqHeader, reqBody, contentObj, logObj) {
  var it = contentObj.iterator()
  while (it.hasNext()) { // HEADER loop
    var obj = it.next()
    print("=======obj" + obj)
    var in_storage_list = obj.get('IN_STORAGE_LIST') //入库返空单列表

    print("==============in_storage_list"+in_storage_list)
    var insert_user = "\"" + "ADMIN" + "\""
    //获取最大ID
    ls_maxid_sql = "select CONTAINER_IN_STORAGE_SEQ.NEXTVAL AS ID from  dual"
    var rows = $.jdbcTemplate.queryForList(ls_maxid_sql);
    var li_in_storage_maxid = rows[0].ID;

    var storageList = in_storage_list.iterator()

    while (storageList.hasNext()) { //取出数组里的值拼成字符串
      var ctIt = storageList.next()
      var return_box_bill_code = ctIt.get('RETURN_BOX_BILL_CODE')
      var car_no = ctIt.get('CAR_NO')
      var driver_code = ctIt.get('DRIVER_CODE')
      var driver_name = ctIt.get('DRIVER_NAME')
      var in_storage_type = ctIt.get('IN_STORAGE_TYPE')
      var supplier_code = ctIt.get('SUPPLIER_CODE')
      var send_place_code = ctIt.get('SEND_PLACE_CODE')
      var storage_code = ctIt.get('STORAGE_CODE')
      var in_storage_emp = ctIt.get('IN_STORAGE_EMP')
      var in_storage_time = ctIt.get('IN_STORAGE_TIME')

      // 插入明细
      var insert_storage_details_sql = "insert into NCS_INFO_CONTAINER_STO_DETAILS(ID,CONTAINER_STORAGE_ID,RETURN_BOX_BILL_CODE,CAR_NO,DRIVER_CODE,DRIVER_NAME,IN_STORAGE_TYPE,SUPPLIER_CODE ,SEND_PLACE_CODE,STORAGE_CODE,IN_STORAGE_EMP,IN_STORAGE_TIME,Insert_User,Insert_Date)" +
        "values (CONTAINER_STO_DETAILS_SEQ.NEXTVAL," + li_in_storage_maxid + "," + return_box_bill_code + "," + car_no + "," + driver_code + "," + driver_name + "," + in_storage_type + "," + supplier_code + "," + send_place_code + "," + storage_code + "," + in_storage_emp + "," + in_storage_time + "," + insert_user + " , SYSDATE  )"
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


    //in_storage_list = "\"" + "" + "\""
    var insert_storage_sql = "insert into NCS_INFO_CONTAINER_IN_STORAGE (ID,INSERT_USER,Insert_Date)  " +
      "values (" + li_in_storage_maxid + "," + insert_user + " ,  SYSDATE  )"
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
