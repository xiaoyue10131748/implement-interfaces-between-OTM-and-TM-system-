// CAR_APPLY

var CallableStatementCreator = Java.type('org.springframework.jdbc.core.CallableStatementCreator')
var CallableStatementCallback = Java.type('org.springframework.jdbc.core.CallableStatementCallback')


function createOrderReleaseXid($) {
  return $.queryService.jdbcTemplate.execute(
    new CallableStatementCreator({
      createCallableStatement: function(con) {
        cs = con.prepareCall('{call glogowner.ncs_util.get_next_or_xid(?)}')
        cs.registerOutParameter(1, java.sql.Types.VARCHAR)
        return cs
      }
    }),
    new CallableStatementCallback({
      doInCallableStatement: function(cs) {
        cs.executeUpdate()
        return cs.getString(1)
      }
    })
  )
}


function transfer($, header, trayDetails) {
  print('header', header)
  print('trayDetails', trayDetails)
  // 查询数据库对应字段，需要参考模版中的变量引用
  var tmp = common.hashMap()
  var need_place_code = header.get('NEED_PLACE_CODE')
  //var xiaoyue=xy
  print("==============need_place_code" + need_place_code)
  tmp.put("NEED_PLACE_CODE", header.get('NEED_PLACE_CODE'))
  tmp.put("NEED_GOODS_CODE", header.get('NEED_GOODS_CODE'))
  try {
  common.scmpQueryValue($, header, 'SUPPLIER_NAME',
    "SELECT CORPORATION_NAME AS \"SUPPLIER_NAME\" FROM CORPORATION WHERE CORPORATION_GID = ?", ['NCS.' + header.get('SUPPLIER_CODE')])
  } catch (e) {
    throw new java.lang.IllegalArgumentException('供应商和发点没维护。'+'  申请单号:'+header.get('APPLY_CODE')+'  发点:'+header.get('SEND_PLACE_CODE')+'  供应商编码: '+header.get('SUPPLIER_CODE')+'  到点:'+header.get('NEED_PLACE_CODE'))

    logObj.put("rmk", '供应商和发点没维护'+'  申请单号:'+header.get('APPLY_CODE')+'  发点:'+header.get('SEND_PLACE_CODE')+'  供应商编码: '+header.get('SUPPLIER_CODE')+'  到点:'+header.get('NEED_PLACE_CODE'))
  }

  try {
    common.scmpQueryValue($, tmp, 'SHIP_FROM_LOCATION_GID',
      "SELECT LOCATION_GID AS \"SHIP_FROM_LOCATION_GID\" FROM LOCATION_REFNUM WHERE LOCATION_REFNUM_QUAL_GID = 'NCS.出货地代码-DFL' AND LOCATION_REFNUM_VALUE = ?", [header.get('SUPPLIER_CODE') + '-' + header.get('SEND_PLACE_CODE')])
    common.scmpQueryValue($, header, 'SHIP_FROM_LOCATION_XID',
      "SELECT LOCATION_XID AS \"SHIP_FROM_LOCATION_XID\" FROM LOCATION WHERE LOCATION_GID = ?", [tmp.get('SHIP_FROM_LOCATION_GID')])
  } catch (e) {

    throw new java.lang.IllegalArgumentException('发点到点信息不足，需OTM补足，请维护基础数据。'+'  申请单号:'+header.get('APPLY_CODE')+'  发点:'+header.get('SEND_PLACE_CODE')+'  供应商编码: '+header.get('SUPPLIER_CODE')+'  到点:'+header.get('NEED_PLACE_CODE'))

    logObj.put("rmk", '发点到点信息不足，需OTM补足，请维护基础数据。'+'  申请单号:'+header.get('APPLY_CODE')+'  发点:'+header.get('SEND_PLACE_CODE')+'  供应商编码: '+header.get('SUPPLIER_CODE')+'  到点:'+header.get('NEED_PLACE_CODE'))
  }
  try {
    common.scmpQueryValue($, header, 'ATTRIBUTE19',
      "SELECT DECODE(ZONE2,'郑州','C2','大连','C2','C1') AS \"ATTRIBUTE19\" FROM LOCATION WHERE LOCATION_GID = ?", [tmp.get('SHIP_FROM_LOCATION_GID')])

    common.scmpQueryValue($, header, 'ATTRIBUTE20',
      "SELECT ZONE2 AS \"ATTRIBUTE20\" FROM LOCATION WHERE LOCATION_GID = ?", [tmp.get('SHIP_FROM_LOCATION_GID')])
  } catch (e) {

    throw new java.lang.IllegalArgumentException('据点无法查询，请维护基础数据')

    logObj.put("rmk", "据点无法查询，请维护基础数据")
  }



  try {
    common.scmpQueryValue($, header, 'NEED_PLACE_CODE',
      "SELECT LOCATION_XID AS \"NEED_PLACE_CODE\" FROM LOCATION WHERE ATTRIBUTE20 = ? AND SUBSTR(REPLACE(ATTRIBUTE2,'NCS.',''),0,1)=?", [tmp.get('NEED_PLACE_CODE'), tmp.get('NEED_GOODS_CODE')])
    print("=======NEED_PLACE_CODE" + header.get('NEED_PLACE_CODE'))

  } catch (e) {
    header.put("NEED_PLACE_CODE", need_place_code)
    print("=======NEED_PLACE_CODE" + header.get('NEED_PLACE_CODE'))
  }



  // if (header.get('NEED_PLACE_CODE')=='')
  // header.put("NEED_PLACE_CODE",need_place_code)
  // print("=======NEED_PLACE_CODE1"+header.get('NEED_PLACE_CODE'))



  /*
      header.put('ATTRIBUTE19', 'ATTRIBUTE19')
      header.put('ATTRIBUTE20', 'ATTRIBUTE20')
      header.put('SHIP_FROM_LOCATION_XID', 'SHIP_FROM_LOCATION_XID')
    */
  // 调用存储过程创建XID
  var orGid = $.doInNewTransaction(function() {
    return createOrderReleaseXid($)
  })
  header.put('ORDER_RELEASE_XID', orGid)
  // 生成明细行号
  Java.from(trayDetails).forEach(function(item, i) {
    item.put('LINE_NUM', java.lang.String.format('%03d', new java.lang.Integer(i + 1)))
  })

  header.put('details', trayDetails)
  return header
}


function isContains(str, substr) {
  return str.indexOf(substr) >=0;
} //判断是否含有子串,包含返回true，不包含返回false


common.SCMP_INBOUNDS['CAR_APPLY'] = function($, reqHeader, reqBody, contentObj, logObj) {
  // print("========contentObj" + contentObj)
  var orderList = common.arrayList()
  var it = contentObj.iterator()
  print("========CAR_APPLY items", contentObj.size())
  while (it.hasNext()) { // HEADER loop
    var obj = it.next()
    // print("=======obj" + obj)
    var header = common.scmpJsonObjectToMap(obj)
    // print("===========test header" + header) //将传过来的json对象转成map
    common.scmpDecodeTimeField(header, 'EXPECT_TIME')
    var trayDetailsList = common.arrayList()
    var trayDetails = obj.get('TRAY_DETAILS')
    // print("========trayDetails" + trayDetails)
    var tdIt = trayDetails.iterator()
    print("=========trayDetails size" + trayDetails.size())
    var sum_qty2 = 0
    var count = common.hashMap() //统计所有发行号的数目
    while (tdIt.hasNext()) { // TRAY_DETAILS loop 循环每一个托盘，把第三级的第一个明细放入第二级
      var trayDetail = tdIt.next()
      // print("========single_trayDetail" + trayDetail)
      var tray = common.scmpJsonObjectToMap(trayDetail)
      // print("==========Map_tray" + tray)
      var key1 = tray.get('TRAY_ARRI_PLAN_DATE')
      common.scmpDecodeTimeField(tray, 'TRAY_ARRI_PLAN_DATE')
      trayDetailsList.add(tray)
      // print("===========trayDetailsListxy" + trayDetailsList)
      // BOX_DETAILS的第一行合并到所属的TRAY_DETAIL
      // 其余BOX_DETAILS的行取出ISSUE_CODE后拼成一个字符串也并入所属的TRAY_DETAIL的一个字段
      var boxDetails = trayDetail.get('BOX_DETAILS')
      var key2 = ''
      if (boxDetails && boxDetails.size() > 0) {
        var box = common.scmpJsonObjectToMap(boxDetails.get(0))
        // print("=======box" + box)
        key2 = box.get('ISSUE_CODE')
        key3 = box.get('PART_CODE')
        common.scmpDecodeTimeField(box, 'ARRI_PLAN_DATE')
        tray.putAll(box) //将box放入第二级

        // var otherIssueCodes = []
        var bdIt = boxDetails.iterator()
        var sum_qty = 0
        var all_issue_code = ''
        var duplicate_all_issue_code='' // 存所有的发行号
        while (bdIt.hasNext()) {
          var boxDetail = bdIt.next()
          var count_issue_code = boxDetail.get('ISSUE_CODE')
          var issue_code = boxDetail.get('ISSUE_CODE').asText()
          var tag = isContains(all_issue_code, issue_code)
          print("==========issue_codetest"+issue_code) //判断是否包含
          print("=======isContains" + tag)
         if (!tag) {
            all_issue_code = all_issue_code + issue_code + ","
           }
          //去除重复出现的发行号

          // otherIssueCodes.push(boxDetail.get('ISSUE_CODE').asText()) //拼发行号
          sum_qty = sum_qty + box.get('QTY') //将每个托盘下的胶箱数进行合计
          //  count.put(count_issue_code, boxDetail.get('ISSUE_CODE'))
        }
        //  print("========count_issue_code" + count.size())
        //logObj.put("rmk", "申请单号为："+ header.get("APPLY_CODE")+"的订单发行号总计为：" + count.size())
        // tray.put('ALL_ISSUE_CODES', otherIssueCodes.join(',')) // 将拼好的发行号放入第二级
        all_issue_code = all_issue_code.substring(0, all_issue_code.length - 1) //去除最后一个逗号
  // print("==========all_issue_codetext"+all_issue_code)
  duplicate_all_issue_code=all_issue_code
        tray.put('ALL_ISSUE_CODES', all_issue_code) // 将拼好的发行号放入第二级
        all_issue_code = '' //清空循环后的所拼的发行号
      }
  // print("==========all_issue_codetext111"+all_issue_code)
      var flag = isContains(duplicate_all_issue_code, ",") // 判断是否为混拖
      print("================flag" + flag)
      if (flag) {
        var key2 = trayDetail.get('TRAY_CODE')

      }
      //  sum_qty2 = sum_qty2 + sum_qty //将每个托盘下的胶箱数的合计数再在进行合计
      //print("================sum_qty222" + sum_qty2)
      tray.put('QTY', sum_qty)


      // print("**********" + header)
      tray.put('TRAY_KEY', key1 + '.' + key2) //拼分组条件

    } // END: TRAY_DETAILS loop

    // 按TRAY_KEY分组
    // print("========trayDetailsList" + trayDetailsList)
    var trayGroups = trayDetailsList.stream().collect(java.util.stream.Collectors.groupingBy(function(tray) {
      return tray.get('TRAY_KEY')
    })).values()
    // print("========trayGroups" + trayGroups)
    var sum_qty2 = 0
    var box_qty = 0
    var tgIt = trayGroups.iterator()
    while (tgIt.hasNext()) {
      var b = tgIt.next()
      // print("==============xb" + b)
      var details = b.get(0) // 取出数组里的map对象，放入头中
      // print("========xyy" + details)
      var code = details.get('ALL_ISSUE_CODES')
      var part_code = details.get('PART_CODE')
      var length = details.get('TRAY_LENGTH')
      var width = details.get('TRAY_WIDTH')
      var height = details.get('TRAY_HEIGHT')
      var type = details.get('TRAY_TYPE_CODE')
      var qty = details.get('QTY')
      var i
      for (i = 0; i < b.size(); i++) {
        var every_detail = b.get(i)
        var box = every_detail.get('BOX_QTY')
        box_qty = box_qty + box
      }
      sum_qty2 = sum_qty2 + qty

      header.put('ALL_ISSUE_CODES', code)
      header.put('PART_CODE', part_code)
      header.put('TRAY_LENGTH', length)
      header.put('TRAY_WIDTH', width)
      header.put('TRAY_HEIGHT', height)
      header.put('TRAY_TYPE_CODE', type)
      header.put('QTY', sum_qty2)
      header.put('BOX_QTY', box_qty)
      sum_qty2 = 0 //将每个托盘下的胶箱数的合计数再在进行合计
      box_qty = 0
      // print("=======header2111" + header)
      // print("=======header3333" + header.clone())
      orderList.add(transfer($, header.clone(), b))
    }
    sum_qty2 = 0
    box_qty = 0
  }
  // print("======orderList2222" + orderList)
  if (orderList.length > 0) {
    var templatePath = 'freemarker/scmp/order_release.ftl'
    var templateModel = common.hashMap(
      'orders', orderList
    )
    var transmission = common.scmpCallOTM($, templatePath, templateModel)

    logObj.put('transmission', transmission)
  }


  //  形成计费订单
  var orderList1 = common.arrayList()

  var it = contentObj.iterator()
  var tag = 0 //标记拼备注
  while (it.hasNext()) {
    var count_code = common.hashMap() //统计所有发行号的数目
    var boxDetailsList = common.arrayList() // HEADER loop
    var obj = it.next()
    var header = common.scmpJsonObjectToMap(obj)
    common.scmpDecodeTimeField(header, 'EXPECT_TIME')
    var trayDetails = obj.get('TRAY_DETAILS')
    var tdIt = trayDetails.iterator()
    var tray_arri_plan_date = ''
    var tray_time = ''

    while (tdIt.hasNext()) { // TRAY_DETAILS loop
      var trayDetail = tdIt.next()
      var tray = common.scmpJsonObjectToMap(trayDetail)
      tray_arri_plan_date = trayDetail.get('TRAY_ARRI_PLAN_DATE').asText()
      print("=========TRAY_ARRI_PLAN_DATE" + tray_arri_plan_date)
      tray_time = common.scmpDecodeTime(tray_arri_plan_date)

      print("=========TRAAAAA" + tray_time)
      var boxDetails = trayDetail.get('BOX_DETAILS')
      // print("=======boxDetails1" + boxDetails)
      var bdIt = boxDetails.iterator()
      var count = 0
      var type = trayDetail.get('TRAY_TYPE_CODE').asText()
      // var box_qty=trayDetail.get('BOX_QTY').asText()
      // var is_first=1
      while (bdIt.hasNext()) {
        var boxDetails = bdIt.next()
        var box = common.scmpJsonObjectToMap(boxDetails)

        // print("======box" + box)
        var key = box.get('ISSUE_CODE')
        count_code.put(key, box.get('ISSUE_CODE'))
        if (count == 0) {
          if (type == "F") {
            box.put('F_count', 1)
            box.put('T_count', 0)
          } else {
            box.put('F_count', 0)
            box.put('T_count', 1)
          }
        } else {
          box.put('F_count', 0)
          box.put('T_count', 0)
        }
        //F返回托盘，T返回铁盘

        box.put('BOX_QTY', 1)

        boxDetailsList.add(box)
        count++
        box.put('TRAY_KEY', key)
      }
    }
    if (tag == 0) {
      logObj.put("rmk", "申请单号为：" + header.get("APPLY_CODE") + "的订单发行号总计为：" + count_code.size())
    } else {
      var reserve = logObj.get('rmk')
      var content = "申请单号为：" + header.get("APPLY_CODE") + "的订单发行号总计为:" + count_code.size() + "; " + reserve + ","
      content = content.substring(0, content.length - 1)
      logObj.put("rmk", content)
    }
    tag++
    // print("=====boxDetailsList" + boxDetailsList)
    var boxGroups = boxDetailsList.stream().collect(java.util.stream.Collectors.groupingBy(function(box) {
      return box.get('TRAY_KEY')
    })).values()

    // print("=====boxGroups" + boxGroups)
    var box_qty = 0 //合计box_qty
    var tgIt = boxGroups.iterator()
    while (tgIt.hasNext()) {
      var boxDetails = tgIt.next();
      var j
      for (j = 0; j < boxDetails.size(); j++) {
        var details = boxDetails.get(j)
        var box = details.get('BOX_QTY')
        box = parseInt(box)
        box_qty = box_qty + box
        print("+++++++++a" + box_qty)
      }
      var boxDetailsparm = common.arrayList()
      // print("========boxDetails" + boxDetails)
      print("========boxDetails" + boxDetails.size());
      //循环处理 分组后多条记录的 数据
      var sum_qty = 0;
      var sum_tps = 0;
      var sum_tjs = 0;
      var issue_code = '';
      var part_name = '';
      var part_code = '';
      for (var i = 0; i < boxDetails.size(); i++) {
        if (i == 0) {
          boxDetailsparm = boxDetails[0];
          issue_code = boxDetails[0].ISSUE_CODE;
          part_name = boxDetails[0].PART_NAME
          part_code = boxDetails[0].PART_CODE
          work_order_no = boxDetails[0].WORK_ORDER_NO
        }
        sum_qty = sum_qty + boxDetails[i].QTY;
        sum_tps = sum_tps + boxDetails[i].F_count;
        sum_tjs = sum_tjs + boxDetails[i].T_count;
      }
      //修改合计值 。
      boxDetailsparm.QTY = sum_qty;
      boxDetailsparm.F_count = sum_tps;
      boxDetailsparm.T_count = sum_tjs;
      // print("============boxDetailsparm  " + boxDetailsparm)
      header.put('QTY', sum_qty)
      header.put('ISSUE_CODE', issue_code)
      header.put('F_count', sum_tps)
      header.put('T_count', sum_tjs)
      header.put('PART_CODE', part_code)
      header.put('TRAY_ARRI_PLAN_DATE', tray_time)
      header.put('WORK_ORDER_NO', work_order_no)
      header.put('BOX_QTY', box_qty)
      print("+++++++++b" + box_qty)
      box_qty = 0
      // header.put('TRAY_ARRI_PLAN_DATE',tray_arri_plan_date)
      //tray_time
      //header.put('TRAY_ARRI_PLAN_DATE',tray_arri_plan_date)
      // print("=============hhh" + header)
      orderList1.add(transfer($, header.clone(), common.objectArray(boxDetailsparm)))
    }
    box_qty = 0
  }
  if (orderList1.length > 0) {
    var templatePath = 'freemarker/scmp/order_settlement.ftl'
    var templateModel = common.hashMap(
      'orders', orderList1
    )
    var transmission = common.scmpCallOTM($, templatePath, templateModel)

    logObj.put('transmission1', transmission)
  }
  return common.scmpCreateResponse(reqHeader, reqBody, '0', 'OK')
}
