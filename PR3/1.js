const tovari = [
  {name:"apple", count: 5, price: 70},
  {name:"orange", count: 10, price: 90},
  {name:"Banan", count: 15, price: 50}
]

console.log('Товары: ',tovari)

let cost = 0;
let costForEach = 0;

for (let i = 0; i < tovari.length; i++) {

    const tovar = tovari[i];
    const tovarCost = tovar.count * tovar.price;
    console.log(`Товар "${tovar.name}": ${tovar.count} шт. × ${tovar.price} руб. = ${tovarCost} руб.`);
    cost += tovarCost;
}
console.log("Общая стоимость всех товаров: ", cost, " руб.");

let count = 0; 

for (let i = 0; i < tovari.length; i++) {
    const tovar = tovari[i];
    const tovarcount = tovar.count;
    count += tovarcount;
    console.log(`Количество товара: "${count}"`)
}

console.log(`Количество товара: "${count}"`);

const billResult = {
    bill: tovari,
    result: cost
};

console.log(JSON.stringify(billResult));

//Dop zadanie 1
tovari.forEach(tovari => {
    const tovarForEachCost = tovari.count * tovari.price;
    console.log(`Товар "${tovari.name}": ${tovari.count} шт. × ${tovari.price} руб. = ${tovarForEachCost} руб.`);
    costForEach += tovarForEachCost;
});

console.log("Общая стоимость всех товаров(Доп. Задани1):", costForEach, "руб.");

//Dop zadanie 2
const now = new Date();

console.log("toString: ", now.toLocaleDateString())
console.log("toLocaleTimeString: ", now.toLocaleTimeString())



