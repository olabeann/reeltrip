// One reviewed travel concept per row: Korean gloss, English, Simplified Chinese, Japanese.
// The display name is selected once on signup. Keep retired names valid for existing profiles.
{
 const names = [
  ["구름","Cloud","云朵","雲"],
  ["무지개","Rainbow","彩虹","虹"],
  ["달","Moon","月亮","月"],
  ["별","Star","星星","星"],
  ["하늘","Sky","天空","空"],
  ["바다","Sea","海洋","海"],
  ["파도","Wave","海浪","波"],
  ["바람","Wind","风","風"],
  ["숲","Forest","森林","森"],
  ["나무","Tree","树","木"],
  ["꽃","Flower","花","花"],
  ["풀","Grass","草","草"],
  ["섬","Island","岛屿","島"],
  ["호수","Lake","湖泊","湖"],
  ["이슬","Dew","露水","露"],
  ["안개","Mist","雾","霧"],
  ["노을","Afterglow","晚霞","夕焼け"],
  ["나비","Butterfly","蝴蝶","蝶"],
  ["민들레","Dandelion","蒲公英","タンポポ"],
  ["봄","Spring","春天","春"]
 ];
 window.ReelNicknameBases = Object.fromEntries(['ko','en','zh-CN','ja'].map((lang,i)=>[lang,names.map(row=>row[i])]));
}
