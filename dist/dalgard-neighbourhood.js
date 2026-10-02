// Style records for the buildings round Dalgård skole (1 October 2026), from listing photos, a drone-photo set and the aerial photo.
// Same keys as buildingStyles in building-details.js (wall, roof, levels, height, flat, siding, horizontalSiding, brick, lowerWall,
// sections, balconies ...) plus `plain` (render, no boards or stripes). junction-buildings.js merges these over the older records, so
// a record here wins. What each record is based on, and how sure it is: docs/dalgard-neighbourhood.md and docs/dalgard-references.md.
// Colours are visual estimates from the photos, not sampled from them.

// Roof colours judged by eye on the Esri World Imagery aerial photo (viewed, not traced or sampled), 1 October 2026. R: red-orange tile.
const aerialRed=['191360330','191360341','1037053351','191198626','191198659','191360421'];

export const neighbourhoodStyles={
 // ---- Dalgårdstunet (OBOS, 2024-25): cream-yellow render, dark flat roofs, grey-brown ground floor, balconies with glass and dark rails ----
 // Hus A, the Coop Extra building at the corner of Anders Wigens veg: FINN 247003441 (drone photos 25, 26, 35), FINN 461130887 (street photo 21).
 '1312240278':{wall:'#ead9ac',roof:'#4a4d50',levels:5,height:16.4,flat:true,plain:true,lowerWall:'#6d655b',source:'finn-247003441;finn-461130887'},
 // Hus B, the wing along the square: yellow-ochre render in the courtyard photos (FINN 461130887 photo 22, FINN 247003441 photos 32 and 34).
 '1312240279':{wall:'#dcc487',roof:'#4a4d50',levels:4,height:13.4,flat:true,plain:true,lowerWall:'#6d655b',balconies:'south',source:'finn-461130887;finn-247003441'},
 // Odd Husbys veg 6A, 6B, 8 (second stage, 2024): warm beige render, four floors over a ground floor of terraces behind low concrete walls
 // (FINN 464171086 photo 3, FINN 473864059 photos 24 and 25).
 '1383932240':{wall:'#d6c9b6',roof:'#4c4f52',levels:4,height:13.2,flat:true,plain:true,source:'finn-464171086;finn-473864059'},
 // Odd Husbys veg 4A-4M (2025): the long block of taupe-brown vertical timber, glass balconies, roof terraces on the top floor
 // (FINN 462751345 photos 19-21, the street photo 20 is taken from Odd Husbys veg).
 '1383932241':{wall:'#8d7a68',roof:'#575b5d',levels:4,height:12.8,flat:true,siding:true,source:'finn-462751345'},
 // ---- Anders Wigens veg 22-28 (2005-06): dark grey-brown vertical timber, flat roofs with light grey roofing, long balconies with white-grey rails ----
 // 28: FINN 459746591 (photos 0, 9, 10, 19: drone and garden photos), DNB listing of 28H (photo 23). 22 and 24 are the same estate and
 // year (bolig.ai: built 2006); drawn like 28 by analogy, not photographed.
 '191360366':{wall:'#766c60',roof:'#8e9190',levels:2,height:6.3,flat:true,siding:true,source:'finn-459746591;dnb-28h'},
 '191360336':{wall:'#766c60',roof:'#8e9190',levels:2,height:6.3,flat:true,siding:true,source:'by-analogy-with-anders-wigens-veg-28'},
 '1037053955':{wall:'#766c60',roof:'#8e9190',levels:2,height:6.3,flat:true,siding:true,source:'by-analogy-with-anders-wigens-veg-28'},
 // ---- Anders Wigens veg 1 (dentist), the low building with a pale metal hip roof and brick walls beside the car park (FINN 247003441 photo 25) ----
 '89247086':{wall:'#b09078',roof:'#a2a7a9',levels:1,brick:true,roofShape:'hipped',source:'finn-247003441'},
 // ---- Uglagjerdet: cream timber houses with dark roofs (FINN 451662725, Uglagjerdet 7, photos 0, 32-35) ----
 '191320567':{wall:'#e8e0c8',roof:'#3d3f42',levels:2,horizontalSiding:true,roofShape:'gabled',roofRise:2.8,source:'finn-451662725'},
 '191320565':{wall:'#e8e0c8',roof:'#3d3f42',levels:2,horizontalSiding:true,roofShape:'gabled',roofRise:2.8,source:'by-analogy-with-uglagjerdet-7'},
 // Uglagjerdet 11-19 and 46-52 (2022, Voll arkitekter): three-floor terraces, flat roofs, vertical timber in dark red, green and charcoal.
 // The colours are from the architect's illustration and the aerial photo of the completed rows (FINN 451662725 photos 30, 32);
 // which unit has which colour is not known, the four panels are an even alternation.
 '1163311167':{wall:'#4a4d52',roof:'#3f4244',levels:3,flat:true,siding:true,sections:['#6b3a35','#3f5a47','#4a4d52','#6b3a35'],source:'voll-arkitekter-rekkehus-pa-dalgard;finn-451662725'},
 '1163311168':{wall:'#4a4d52',roof:'#3f4244',levels:3,flat:true,siding:true,sections:['#4a4d52','#6b3a35','#3f5a47','#6b3a35'],source:'voll-arkitekter-rekkehus-pa-dalgard;finn-451662725'},
 // ---- Odd Husbys veg 26 and 26A (halves of a semi-detached house): dark grey vertical boards, blue-grey tile roof, white window frames
 // (FINN 465103210 photos 0-7, 25-27) ----
 '191198604':{wall:'#5d6064',roof:'#363c44',levels:2,siding:true,roofShape:'gabled',trim:'#f1f0ea',source:'finn-465103210'},
 '1037053286':{wall:'#5d6064',roof:'#363c44',levels:2,siding:true,roofShape:'gabled',trim:'#f1f0ea',source:'finn-465103210'},
};
for(const id of aerialRed)if(!neighbourhoodStyles[id])neighbourhoodStyles[id]={roof:'#9a4a34',source:'aerial-esri-2026-10-01'};
