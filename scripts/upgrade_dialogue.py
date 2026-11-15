from pathlib import Path
import json
R=Path(__file__).resolve().parent.parent
path=R/'data/stage.json';stage=json.loads(path.read_text(encoding='utf-8'))
stage['anchors']['whisper_guest']=[-.55,-.30,.025]
edge=['room_center','whisper_guest']
if edge not in stage['edges']:stage['edges'].append(edge)
stage['acoustics']={'ranges':{'normal':4.5,'whisper':.9,'call':9},'zones':[{'id':'room','min':[-4.1,-2.5],'max':[2.30,2.5]},{'id':'yard','min':[2.30,-3.0],'max':[6,3]}],'portals':[{'zones':['room','yard'],'open':True,'name':'院门'}],'note':'舞台规则：普通话与低语不跨声区，呼喊可经开启的院门跨区；距离是项目演出参数，不是声学测量。'}
path.write_text(json.dumps(stage,ensure_ascii=False,indent=2),encoding='utf-8')
path=R/'data/scene-one.json';story=json.loads(path.read_text(encoding='utf-8'))
targets={'gouer':['granny'],'granny':['gouer','liushi'],'liushi':['granny'],'baner':['granny']}
for beat in story['beats']:
 if beat['id']=='private-care':continue
 for d in beat['dialogue']:
  d['to']=targets.get(d['speaker'],['granny']);d['mode']='normal'
  if beat['id']=='instructions':d['to']=['baner']
  if beat['id']=='farewell' and d['speaker']=='granny':d['to']=['liushi']
  c={'at':d['at'],'type':'face','actor':d['speaker'],'target':d['to'][0]}
  if c not in beat['commands']:beat['commands'].append(c)
private={'id':'private-care','title':'靠近说句私话','duration':22,'narration':'刘氏走到母亲近旁，两人停下脚步，相对站着。她把声音压低了些。','dialogue':[{'at':5,'until':13,'speaker':'liushi','to':['granny'],'mode':'whisper','text':'娘，若真有人给您脸色看，您就回来。别为了我们，硬撑着受委屈。'}],'commands':[{'at':0,'type':'move','actor':'liushi','target':'whisper_guest','duration':4},{'at':4.1,'type':'face','actor':'liushi','target':'granny'},{'at':4.1,'type':'face','actor':'granny','target':'liushi'},{'at':4.1,'type':'expression','actor':'liushi','value':'thinking'},{'at':9,'type':'gesture','actor':'granny','value':'nod','duration':1.3},{'at':15,'type':'move','actor':'liushi','target':'liushi_near','duration':4},{'at':19,'type':'face','actor':'granny','target':'gouer'}],'memory':'刘氏靠近母亲低声表达关切，只有刘姥姥听清；其他人没有获得这段话的内容。'}
private['narration']='狗儿往屋内另一侧走了两步，刘氏也走到母亲近旁。两人停下后，她压低了声音。'
private['commands'] += [{'at':0,'type':'move','actor':'gouer','target':'gouer_pace','duration':2},{'at':19,'type':'move','actor':'gouer','target':'gouer_listen','duration':2.5}]
if not any(b['id']==private['id'] for b in story['beats']):story['beats'].insert(5,private)
story['version']=1;story['communicationVersion']=1
path.write_text(json.dumps(story,ensure_ascii=False,indent=2),encoding='utf-8')
print('Added explicit recipients, voice modes, acoustic zones and a 22-second approach/whisper/return example')
