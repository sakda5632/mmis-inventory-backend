import Knex = require('knex');
import * as moment from 'moment';

export class PickModel {

    getPick(knex: Knex, pickId: any) {
        return knex('wm_pick as p')
            .select('p.*', 'ww.warehouse_name', knex.raw('concat(t.title_name, up.fname, " ", up.lname) as fullname'))
            .join('wm_warehouses as ww', 'ww.warehouse_id', 'p.wm_pick')
            .leftJoin('um_people as up', 'up.people_id', 'p.people_id')
            .leftJoin('um_titles as t', 't.title_id', 'up.title_id')
            .where('pick_id', pickId)
    }
    getList(knex: Knex, limit: number = 20, offset: number = 0) {
        return knex('wm_pick as p')
            .select('p.*', 'ww.warehouse_name', knex.raw('concat(t.title_name, up.fname, " ", up.lname) as fullname'))
            .join('wm_warehouses as ww', 'ww.warehouse_id', 'p.wm_pick')
            .leftJoin('um_people as up', 'up.people_id', 'p.people_id')
            .leftJoin('um_titles as t', 't.title_id', 'up.title_id')
            .orderBy('p.pick_date', 'desc')
            .limit(limit)
            .offset(offset)
    }
    getListTotal(knex: Knex) {
        return knex('wm_pick as p')
            .select(knex.raw('count(p.pick_id) as total'))
        // .groupBy('p.pick_id')
    }
    gerProductReceiveNotPO(knex: Knex, query: any) {
        return knex('wm_receive_detail as wrd')
            .select(
                'wrd.lot_no',
                'wr.receive_id',
                'wr.receive_code',
                'wr.receive_date',
                'mp.product_name',
                'wrd.receive_qty',
                'mp.product_id',
                'u1.unit_name as large_unit',
                'u2.unit_name as small_unit',
                'ug.qty as base_unit',
                'wrd.unit_generic_id',
                knex.raw(`(select sum(pd.pick_qty) from wm_pick_detail as pd join wm_pick as p on p.pick_id = pd.pick_id  where p.is_approve = 'Y' and  pd.product_id = wrd.product_id and pd.lot_no = wrd.lot_no and pd.receive_id = wrd.receive_id group by pd.product_id,pd.lot_no,pd.receive_id) as remain_qty`)
            )
            .join('wm_receives as wr', 'wrd.receive_id', 'wr.receive_id')
            .join('mm_products as mp', 'mp.product_id', 'wrd.product_id')
            .join('mm_generics as mg', 'mg.generic_id', 'mp.generic_id')
            .join('mm_unit_generics as ug', 'ug.unit_generic_id', 'wrd.unit_generic_id')
            .join('mm_units as u1', 'u1.unit_id', 'ug.from_unit_id')
            .join('mm_units as u2', 'u2.unit_id', 'ug.to_unit_id')
            .where('wr.purchase_order_id', null)
            .andWhere('wr.is_cancel', 'N')
            .andWhere('wr.is_success', 'N')
            .andWhere('wr.is_completed', 'N')
    }
    getReceiveProducts(knex: Knex, receiveId: any) {
        return knex('wm_receive_detail as rd')
            .select('p.product_id', 'p.product_name', 'rd.unit_generic_id', 'rd.lot_no', 'rd.discount',
                'p.m_labeler_id', 'p.is_lot_control', 'p.v_labeler_id', 'g.generic_name', 'g.generic_id', 'rd.is_free',
                'rd.warehouse_id', 'rd.location_id', 'ww.warehouse_name', 'll.location_name',
                'rd.receive_qty', 'rd.cost', 'mu.from_unit_id', 'mu.to_unit_id as base_unit_id',
                'mu.qty as conversion_qty', 'u1.unit_name as base_unit_name',
                'u2.unit_name as from_unit_name', 'rd.expired_date',
                'lv.labeler_name as v_labeler_name', 'lm.labeler_name as m_labeler_name'
            )
            .innerJoin('mm_products as p', 'p.product_id', 'rd.product_id')
            .leftJoin('mm_generics as g', 'g.generic_id', 'p.generic_id')
            .leftJoin('mm_unit_generics as mu', 'mu.unit_generic_id', 'rd.unit_generic_id')
            .leftJoin('mm_units as u1', 'u1.unit_id', 'mu.to_unit_id')
            .leftJoin('mm_units as u2', 'u2.unit_id', 'mu.from_unit_id')
            .leftJoin('mm_labelers as lv', 'lv.labeler_id', 'p.v_labeler_id')
            .leftJoin('mm_labelers as lm', 'lm.labeler_id', 'p.m_labeler_id')
            .leftJoin('wm_locations as ll', 'll.location_id', 'rd.location_id')
            .leftJoin('wm_warehouses as ww', 'ww.warehouse_id', 'rd.warehouse_id')
            .innerJoin('wm_receives as r', 'r.receive_id', 'rd.receive_id')
            .where('rd.receive_id', receiveId);
    }
    savePick(knex: Knex, headPick: any) {
        return knex('wm_pick')
            .insert(headPick)
    }
    gerSaveEditPick(knex: Knex, headPick: any, pickId: any) {
        return knex('wm_pick')
            .update(headPick)
            .where('pick_id', pickId)
    }
    checkReceive(knex: Knex, receive_id: any) {
        return knex('wm_receives as wr')
            .where('receive_id', receive_id)
            .andWhereRaw(`(wr.is_cancel = 'Y' or wr.is_success = 'Y' or wr.is_completed = 'Y')`)

    }
    checkApprove(knex: Knex, detail: any) {
        return knex('wm_pick_detail as wpd')
            .select(knex.raw(`rd.receive_detail_id, wpd.pick_detail_id, wpd.receive_id , rd.receive_qty ,wpd.pick_qty`),
                knex.raw(`IFNULL((select sum(pd.pick_qty) from wm_pick_detail as pd join wm_pick as p on p.pick_id = pd.pick_id  where p.is_approve = 'Y' and  pd.product_id = wpd.product_id and pd.lot_no = wpd.lot_no and pd.receive_id = wpd.receive_id group by pd.product_id,pd.lot_no,pd.receive_id),0) as remain_qty`))
            .join('wm_receives as wr', 'wr.receive_id', 'wpd.receive_id')
            .join(knex.raw(`wm_receive_detail as rd on rd.receive_id = wpd.receive_id and rd.product_id = wpd.product_id and rd.lot_no = wpd.lot_no and rd.unit_generic_id = wpd.unit_generic_id`))
            .where('wpd.pick_detail_id', detail.pick_detail_id)
            .andWhere(`wr.is_cancel`,'N')
            .andWhere(`wr.is_success`, 'N')
            .andWhere(`wr.is_completed`,'N')

    }
    gerRemovePickDetail(knex: Knex, pdId: any) {
        return knex('wm_pick_detail')
            .where('pick_id', pdId)
            .delete()
    }
    savePickDetail(knex: Knex, detailPick: any) {
        return knex('wm_pick_detail')
            .insert(detailPick)
    }
    removePick(knex: Knex, item: any, pickId: any) {
        return knex('wm_pick')
            .update(item)
            .where('pick_id', pickId)
    }
    approve(knex: Knex, pickId: any) {
        return knex('wm_pick')
            .update({'is_approve':'Y'})
            .where('pick_id', pickId)
    }
    getDetail(knex: Knex, pickId: any) {
        return knex('wm_pick_detail as wpd')
            .select(
                knex.raw(`(select sum(pd.pick_qty) from wm_pick_detail as pd join wm_pick as p on p.pick_id = pd.pick_id  where p.is_approve = 'Y' and pd.product_id = wpd.product_id and pd.lot_no = wpd.lot_no and pd.receive_id = wpd.receive_id group by pd.product_id,pd.lot_no,pd.receive_id) as remain_qty`),
                'wpd.*', 'p.product_name', 'wpd.lot_no', 'u1.unit_name as small_unit', 'u2.unit_name as large_unit', 'mu.qty as base_unit', 'r.receive_code', 'rd.receive_qty', 'rd.receive_id','r.is_cancel','r.is_success','r.is_completed')
            .innerJoin('wm_receives as r', 'r.receive_id', 'wpd.receive_id')
            .innerJoin(
                knex.raw(`wm_receive_detail as rd on rd.receive_id = wpd.receive_id and rd.product_id = wpd.product_id and rd.lot_no = wpd.lot_no and rd.unit_generic_id = wpd.unit_generic_id `))
            .innerJoin('mm_products as p', 'p.product_id', 'wpd.product_id')
            .leftJoin('mm_generics as g', 'g.generic_id', 'p.generic_id')
            .leftJoin('mm_unit_generics as mu', 'mu.unit_generic_id', 'wpd.unit_generic_id')
            .leftJoin('mm_units as u1', 'u1.unit_id', 'mu.to_unit_id')
            .leftJoin('mm_units as u2', 'u2.unit_id', 'mu.from_unit_id')
            .where('wpd.pick_id', pickId)
    }
}