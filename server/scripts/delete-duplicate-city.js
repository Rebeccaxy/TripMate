// 临时脚本：删除一条「成都市 / 四川」重复城市记录，保留「成都市 / 四川省」
const { db } = require('../src/db/database');

function main() {
  const rows = db
    .prepare(
      `SELECT id, user_id, city_name, province_name, visit_count
       FROM city_visits
       WHERE city_name = '成都市' AND province_name IN ('四川','四川省')
       ORDER BY id`
    )
    .all();

  console.log('当前成都市城市记录:');
  console.log(rows);

  const targets = rows.filter((r) => r.province_name === '四川');
  if (!targets.length) {
    console.log('没有找到 province_name 为「四川」的城市记录，不需要删除。');
    return;
  }

  const toDelete = targets[0];
  console.log('准备删除记录 id=', toDelete.id);
  db.prepare('DELETE FROM city_visits WHERE id = ?').run(toDelete.id);

  const after = db
    .prepare(
      `SELECT id, user_id, city_name, province_name, visit_count
       FROM city_visits
       WHERE city_name = '成都市' AND province_name IN ('四川','四川省')
       ORDER BY id`
    )
    .all();

  console.log('删除后成都市城市记录:');
  console.log(after);
}

main();

