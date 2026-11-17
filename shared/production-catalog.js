export function validateCatalog(catalog){
 if(!catalog||typeof catalog!=='object'||!Object.hasOwn(catalog,'home'))throw Error('场次索引缺少 home');
 for(const [id,item]of Object.entries(catalog)){
  if(!/^[a-z][a-z0-9_-]*$/.test(id)||!item||typeof item.title!=='string')throw Error('场次条目无效 '+id);
  for(const key of ['story','stage','cards','characters'])if(typeof item[key]!=='string'||!item[key].startsWith('data/')||item[key].split('/').includes('..'))throw Error('场次文件路径无效 '+id+':'+key);
  if(item.parent!==null&&!Object.hasOwn(catalog,item.parent))throw Error('上场不存在 '+id);
  if(item.next!==undefined&&!Object.hasOwn(catalog,item.next))throw Error('下一场不存在 '+id);
  const seen=new Set();let cursor=id;while(cursor!==null){if(!Object.hasOwn(catalog,cursor))throw Error('上场不存在 '+cursor);if(seen.has(cursor))throw Error('场次继承存在循环 '+id);seen.add(cursor);cursor=catalog[cursor].parent;}
 }
 return catalog;
}
