var CallableStatementCreator = Java.type('org.springframework.jdbc.core.CallableStatementCreator')
var CallableStatementCallback = Java.type('org.springframework.jdbc.core.CallableStatementCallback')

actions.ncsDispatchOrderRecommand = function($, namspace, request, response) {
  var rows = request.body.selectedRows



  var ls_order_movment_gids = "" //路由ID的集合用
  var ls_create_user = $.userFullName //当前操作用户


  if (rows.length > 1) {
    throw '按车推荐 一次只能选择 一个订单 ，当前选择了[' + rows.length + "]  订单"
  }
  var it = rows.iterator()
  var jdbcTemplate = $.queryService.jdbcTemplate
  while (it.hasNext()) {
    var row = it.next()
    jdbcTemplate.execute(
      new CallableStatementCreator({

        createCallableStatement: function(con) {
          cs = con.prepareCall('{call glogowner.ncs_plan_logic_pkg.ncs_om_ref_rule(?,?)}')
          cs.setString(1, row.order_movement_gid)
          cs.setString(2, ls_create_user)
          return cs

        }
      }),
      new CallableStatementCallback({
        doInCallableStatement: function(cs) {
          cs.executeUpdate()
        }
      })
    )
  }

  response.message = '成功执行 ' + rows.size() + ' 条数据的推荐订单'
  //  response.code = 'refresh';
}
actions.ncsDispatchOrderRecommand.namespace = '*'



//标记到货指示时间
actions.ncsSigntimeRecommand = function($, namspace, request, response) {
  var rows = request.body.selectedRows
  var ls_order_movment_gids = "" //路由ID的集合用
  var ls_create_user = $.userFullName //当前操作用户
  if (rows.length > 1) {
    throw '标记到货时间 一次只能选择 一个订单 ，当前选择了[' + rows.length + "]  订单"
  }
  var it = rows.iterator()
  var jdbcTemplate = $.queryService.jdbcTemplate
  while (it.hasNext()) {
    var row = it.next()
    var adjust_time_sign = row.adjust_time_sign
    var check_minute = adjust_time_sign.toString().substring(2, 4)
    check_minute = parseInt(check_minute)
    if (check_minute > 59) {
      throw '输入的时间格式不对,分钟数<=59'
    }
    var adjust_time_sign = parseInt(adjust_time_sign)
    if (adjust_time_sign > 2359) {
      throw '输入的时间格式不对,只能输入24小时制，例如：0800'
    }
    var sql1 = "UPDATE NCS_ORDER_MOVEMENT_3DLOAD  OM3D SET OM3D.SHIP_END_TIME_SIGN = 0,OM3D.ADJUST_TIME=null  WHERE OM3D.ORDER_MOVEMENT_GID in (select om.order_movement_gid from order_movement om  where om.SHIP_WITH_GROUP= ?)"
    jdbcTemplate.update(sql1, common.objectArray(row.rule_name1))

    if (row.adjust_time_sign == null || row.adjust_time_sign == undefined || row.adjust_time_sign == '') {
      var sql = "UPDATE NCS_ORDER_MOVEMENT_3DLOAD  OM3D SET OM3D.SHIP_END_TIME_SIGN = 1,OM3D.ADJUST_TIME=(select om.late_delivery_date from order_movement om where om.order_movement_gid=OM3D.order_movement_gid) WHERE OM3D.ORDER_MOVEMENT_GID = ?"
      sql = sql.replaceAll("\"", "\'") //将双引号变成单引号2
      jdbcTemplate.update(sql, common.objectArray(row.order_movement_gid))

    } else {
      var sign = row.adjust_time_sign
      var sql2 = "UPDATE NCS_ORDER_MOVEMENT_3DLOAD OM3D  "+
"   SET OM3D.SHIP_END_TIME_SIGN = 1, OM3D.ADJUST_TIME = TO_DATE (TO_CHAR ((SELECT om.ATTRIBUTE_DATE1 + 1/3  "+
"  FROM order_movement om WHERE om.order_movement_gid = OM3D.order_movement_gid ),'YYYY-MM-DD') || LPAD('" + sign + "',4,'0'),'YYYY-MM-DD HH24MI') WHERE OM3D.ORDER_MOVEMENT_GID =?"
      jdbcTemplate.update(sql2, common.objectArray(row.order_movement_gid))

    }

  }

  response.message = '成功标记 ' + rows.size() + ' 条数据的推荐订单'
  //  response.code = 'refresh';
}
actions.ncsSigntimeRecommand.namespace = '*'






// 订单撤销
actions.ncsCancelDispatchOrderRecommand = function($, namspace, request, response) {
  var rows = request.body.selectedRows
  var ls_create_user = $.userFullName //当前操作用户
  var it = rows.iterator()
  var jdbcTemplate = $.queryService.jdbcTemplate
  while (it.hasNext()) {
    var row = it.next()
    jdbcTemplate.execute(
      new CallableStatementCreator({
        createCallableStatement: function(con) {
          cs = con.prepareCall('{call glogowner.ncs_plan_logic_pkg.ncs_om_cancel_pick_order(?,?)}')
          cs.setString(1, row.order_movement_gid)
          cs.setString(2, ls_create_user)
          return cs
        }
      }),
      new CallableStatementCallback({
        doInCallableStatement: function(cs) {
          cs.executeUpdate()
        }
      })
    )
  }
  response.message = '成功撤销 ' + rows.size() + ' 条数据的推荐订单'
  //  response.code = 'refresh';
}
actions.ncsCancelDispatchOrderRecommand.namespace = '*'



// 手工挑单 ncs_om_pick_order
actions.ncsPickOrderRecommand = function($, namspace, request, response) {
  var rows = request.body.selectedRows
  var it = rows.iterator()
  var ls_create_user = $.userFullName
  var jdbcTemplate = $.queryService.jdbcTemplate
  while (it.hasNext()) {
    var row = it.next()
    jdbcTemplate.execute(
      new CallableStatementCreator({
        createCallableStatement: function(con) {
          cs = con.prepareCall('{call glogowner.ncs_plan_logic_pkg.ncs_om_pick_order(?,?)}')
          cs.setString(1, row.order_movement_gid)
          cs.setString(2, ls_create_user)
          return cs
        }
      }),
      new CallableStatementCallback({
        doInCallableStatement: function(cs) {
          cs.executeUpdate()
        }
      })
    )
  }
  response.message = '成功挑选 ' + rows.size() + ' 条数据的订单'
  //  response.code = 'refresh';
}
actions.ncsPickOrderRecommand.namespace = '*'


GenerateShipment = function($, namspace, request, response, is_LTL) {
  var ls_bs_name = '00000000000000000000'
  var ls_order_movment_gids = "" //路由ID的集合用
  var ls_create_user = $.userFullName //当前操作用户
  var s = ""
  var rows = request.body.selectedRows
  var it = rows.iterator()
  var jdbcTemplate = $.queryService.jdbcTemplate
  while (it.hasNext()) {
    var row = it.next()
    ls_order_movment_gids = ls_order_movment_gids + row.order_movement_gid + ","
  }
  ls_order_movment_gids = ls_order_movment_gids.substring(0, ls_order_movment_gids.length - 1) //去除最后一个逗号
  jdbcTemplate.execute(
    new CallableStatementCreator({
      createCallableStatement: function(con) {
        cs = con.prepareCall('{call glogowner.ncs_scan_pkg.ncs_p_bs_create_with_om(?,?,?,?)}')
        cs.setString(1, ls_bs_name)
        cs.setString(2, ls_order_movment_gids)
        cs.setString(3, ls_create_user)
        cs.setString(4, is_LTL)
        cs.registerOutParameter(1, java.sql.Types.VARCHAR)
        return cs
      }
    }),
    new CallableStatementCallback({
      doInCallableStatement: function(cs) {
        cs.executeUpdate()
        s = cs.getString(1)

      }
    })
  )
  response.message = '成功挑选 ' + rows.size() + ' 条数据的订单,生成的运单号为: ' + s

}




actions.ncsRenewLoadByHandRecommand = function($, namspace, request, response) {


  var ls_order_movment_gids = "" //路由ID的集合用
  var ls_create_user = $.userFullName //当前操作用户

  var rows = request.body.selectedRows
  var it = rows.iterator()
  var jdbcTemplate = $.queryService.jdbcTemplate
  while (it.hasNext()) {
    var row = it.next()
    ls_order_movment_gids = ls_order_movment_gids + row.order_movement_gid + ","
  }
  ls_order_movment_gids = ls_order_movment_gids.substring(0, ls_order_movment_gids.length - 1) //去除最后一个逗号



  jdbcTemplate.execute(
    new CallableStatementCreator({
      createCallableStatement: function(con) {
        cs = con.prepareCall('{call  glogowner.ncs_plan_logic_pkg.ncs_om_ref_rule_with_oms(?,?)}')

        cs.setString(1, ls_order_movment_gids)
        cs.setString(2, ls_create_user)
        return cs
      }
    }),
    new CallableStatementCallback({
      doInCallableStatement: function(cs) {
        cs.executeUpdate()
      }
    })
  )

  response.message = '成功挑选 ' + rows.size() + ' 条数据的订单'

}
actions.ncsRenewLoadByHandRecommand.namespace = '*'




// 创建 整车运单 ncsGenerateShipmentRecommand
actions.ncsGenerateShipmentRecommand = function($, namspace, request, response) {
  var rows = request.body.selectedRows
  var it = rows.iterator()
  var jdbcTemplate = $.queryService.jdbcTemplate
  var flag = 1
  var limit_length = 0
  var count_right = 0
  var count_left = 0
  while (it.hasNext()) {
    var row = it.next()
    if (row.actual_car_length !== null || row.actual_car_length !== undefined || row.actual_car_length !== '') {
      limit_length = row.actual_car_length
    } //判断不为空的时候赋值
    count_right = count_right + row.car_length_r

    count_left = count_left + row.car_length_l

    if (row.is_approved != 1) {
      // var s = row.order_movement_gid
      // s = "\'" + s + "\'"
      var sql = "update  NCS_ORDER_MOVEMENT_3DLOAD om3d   set   om3d.IS_APPROVED = 1 where om3d.order_movement_gid =?"
      jdbcTemplate.update(sql, common.objectArray(row.order_movement_gid))
      flag = 0
    }
  }
  print("==================limit_lengthq" + limit_length)
  if ((count_right > limit_length) || (count_left > limit_length)) {
    throw '左右车长已超出' + limit_length + '的限制'
  }
  if (flag == 0) {
    //  response.message='车辆已满,可能装不下,如果需要生成运单,请重新点击生成运单按钮'
    response.messageType = 'warning'
    response.message = '车辆已满或含有含有特殊标识的零件号,可能装不下,如果需要生成运单,请重新点击生成运单按钮'
  } else {
    GenerateShipment($, namspace, request, response, 'N')
  }
}

actions.ncsGenerateShipmentRecommand.namespace = '*'



// 创建 尾货运单 ncsGenerateHalfShipmentRecommand
actions.ncsGenerateHalfShipmentRecommand = function($, namspace, request, response) {
  var rows = request.body.selectedRows
  var it = rows.iterator()
  var jdbcTemplate = $.queryService.jdbcTemplate
  var flag = 1
  var limit_length = 0
  var count_right = 0
  var count_left = 0
  while (it.hasNext()) {
    var row = it.next()
    if (row.actual_car_length !== null || row.actual_car_length !== undefined || row.actual_car_length !== '') {
      limit_length = row.actual_car_length
    } //判断不为空的时候赋值
    count_right = count_right + row.car_length_r
    count_left = count_left + row.car_length_l
    if (row.is_approved != 1) {
      // var s = row.order_movement_gid
      // s = "\'" + s + "\'"
      var sql = "update  NCS_ORDER_MOVEMENT_3DLOAD om3d   set   om3d.IS_APPROVED = 1 where om3d.order_movement_gid =?"
      jdbcTemplate.update(sql, common.objectArray(row.order_movement_gid))
      flag = 0
    }
  }

  if ((count_right > limit_length) || (count_left > limit_length)) {
    throw '左右车长已超出' + limit_length + '的限制'
  }

  if (flag == 0) {
    response.messageType = 'warning'
    response.message = '车辆已满或含有含有特殊标识的零件号的托盘,可能装不下,如果需要生成运单,请重新点击生成运单按钮'
  } else {
    GenerateShipment($, namspace, request, response, 'Y')

  }
  //  response.code = 'refresh';
}
actions.ncsGenerateHalfShipmentRecommand.namespace = '*'



/*
// 拆单 ncsAdjustOrderMoventRecommand
*/

actions.ncsAdjustOrderMoventRecommand = function($, namspace, request, response) {

  var rows = request.body.selectedRows

  if (rows.length > 1) {
    throw '拆单一次只能选择一个订单，当前选择了[' + rows.length + "]  订单"
  }

  var it = rows.iterator()
  var jdbcTemplate = $.queryService.jdbcTemplate
  while (it.hasNext()) {
    var row = it.next()


    if (row.adjust_ship_unit_count <= 0) {
      throw '信息提示：   拆单数量必须大于0,你当前输入值为：' + row.adjust_ship_unit_count
    }

    if (row.adjust_ship_unit_count >= row.total_ship_unit_count) {
      throw '信息提示：   拆单数量不能大于总容器数 '
    }

    jdbcTemplate.execute(
      new CallableStatementCreator({
        createCallableStatement: function(con) {
          cs = con.prepareCall('{call glogowner.NCS_SCAN_PKG.NCS_P_OM_SPLIT(?,?)}')
          cs.setString(1, row.order_movement_gid)
          cs.setString(2, row.adjust_ship_unit_count)
          return cs
        }
      }),
      new CallableStatementCallback({
        doInCallableStatement: function(cs) {
          cs.executeUpdate()
        }
      })
    )
  }
  response.message = '拆单成功'
}
actions.ncsAdjustOrderMoventRecommand.namespace = '*'


// ncs_dispatch_shipment.layout.xml
actions.ncsOmChangeShipment = function($, namespace, request, response) {
  var aux = request.body.aux

  var from = aux.from
  var to = aux.to
  var flag = 0

  if (to.size() == 0) {
    flag = 1
  }
  if (flag == 1) {
    throw "目标区没有数据，不能进行订单调整"
  }
  var rows = request.body.selectedRows
  if (from && to && rows && rows.length > 0) {
    var fromShipmentGid = from[0].value
    var toShipmentGid = to[0].value

    if (toShipmentGid === '未配载') {
      throw '禁止将已配载订单调整为未配载'
    }

    if (fromShipmentGid === toShipmentGid) {
      throw ' A 区，B区 运单相同，运单编号为' + fromShipmentGid
    }

    var rows = request.body.selectedRows
    var oms = Java.from(rows).map(function(row) {
      return row['order_movement_gid']
    })
    oms = oms.join(',')

    $.queryService.jdbcTemplate.execute(
      new CallableStatementCreator({
        createCallableStatement: function(con) {
          cs = con.prepareCall('{call glogowner.NCS_SCAN_PKG.NCS_P_BS_ADJUST_OM(?,?,?,?)}')
          cs.setString(1, toShipmentGid)
          cs.setString(2, fromShipmentGid)
          cs.setString(3, oms)
          cs.setString(4, $.userName)
          return cs
        }
      }),
      new CallableStatementCallback({
        doInCallableStatement: function(cs) {
          cs.executeUpdate()
        }
      })
    )
    response.message = '成功移动数据'
  } else {
    response.messageType = 'warning'
    response.message = '未移动数据'
  }
}
actions.ncsOmChangeShipment.namespace = 'ncs_v_ship_om'








// ncs_dispatch_shipment.layout.xml 撤销路由
actions.ncsRebackShipment = function($, namespace, request, response) {
  var aux = request.body.aux
  var from = aux.from
  var to = aux.to
  var flag = 0
  var rows = request.body.selectedRows

  var fromShipmentGid = from[0].value



  var rows = request.body.selectedRows
  var oms = Java.from(rows).map(function(row) {
    return row['order_movement_gid']
  })
  oms = oms.join(',')

  $.queryService.jdbcTemplate.execute(
    new CallableStatementCreator({
      createCallableStatement: function(con) {

        cs = con.prepareCall('{call glogowner.NCS_SCAN_PKG.NCS_P_BS_REMOVE_OM(?,?,?)}')
        cs.setString(1, fromShipmentGid)
        cs.setString(2, oms)
        cs.setString(3, $.userName)
        return cs
      }
    }),
    new CallableStatementCallback({
      doInCallableStatement: function(cs) {
        cs.executeUpdate()
      }
    })
  )
  response.message = '成功移动数据'
}


actions.ncsRebackShipment.namespace = '*'









// 重新计算 ncs_om_pick_order
actions.ncsRecalculateRecommand = function($, namspace, request, response) {
  var rows = request.body.selectedRows
  var it = rows.iterator()
  var ls_create_user = $.userFullName

  var jdbcTemplate = $.queryService.jdbcTemplate
  while (it.hasNext()) {
    var row = it.next()
    jdbcTemplate.execute(
      new CallableStatementCreator({
        createCallableStatement: function(con) {
          cs = con.prepareCall('{call glogowner.ncs_plan_logic_pkg.ncs_om_ref_rule_with_ship(?,?)}')
          cs.setString(1, row.shipment_gid)
          cs.setString(2, ls_create_user)
          return cs
        }
      }),
      new CallableStatementCallback({
        doInCallableStatement: function(cs) {
          cs.executeUpdate()
        }
      })
    )
  }
  response.message = '成功挑选 ' + rows.size() + ' 条数据的订单'
  //  response.code = 'refresh';
}
actions.ncsRecalculateRecommand.namespace = '*'








// 车辆已满 ncsSetFullRecommand
actions.ncsSetFullRecommand = function($, namspace, request, response) {
  var rows = request.body.selectedRows
  var it = rows.iterator()
  var jdbcTemplate = $.queryService.jdbcTemplate

  var row = it.next()
  jdbcTemplate.execute(
    new CallableStatementCreator({
      createCallableStatement: function(con) {
        cs = con.prepareCall('{call glogowner.ncs_plan_logic_pkg.ncs_ship_set_full(?)}')
        cs.setString(1, row.shipment_gid)
        return cs
      }
    }),
    new CallableStatementCallback({
      doInCallableStatement: function(cs) {
        cs.executeUpdate()
      }
    })
  )

  response.message = '成功挑选 ' + rows.size() + ' 条数据的订单'
  //  response.code = 'refresh';
}
actions.ncsSetFullRecommand.namespace = '*'




//生成运单
actions.ncsNewShipmentRecommand = function($, namspace, request, response) {
  var rows = request.body.selectedRows
  var it = rows.iterator()
  var row = it.next()
  var shipment_gid = row.shipment_gid

  if (shipment_gid == '未配载') {
    GenerateShipment($, namspace, request, response, 'N')
  } else {
    throw '该订单已生成运单，不可重复生成运单'
  }
}

actions.ncsNewShipmentRecommand.namespace = '*'
