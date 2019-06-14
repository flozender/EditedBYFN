const shim = require('fabric-shim');
const util = require('util');
class Chaincode {
    async Init(stub){
        let ret = stub.getFunctionAndParameters();
        console.info(ret);
        console.info('=========== Instantiated ACTCAR Chaincode ===========');
        return shim.success();
    }

    async Invoke(stub){
        console.info('Transaction ID: ' + stub.getTxID());
    console.info(util.format('Args: %j', stub.getArgs()));

    let ret = stub.getFunctionAndParameters();
    console.info(ret);

    let method = this[ret.fcn];
    try{
      if (!method) {
        console.log('no function of name:' + ret.fcn + ' found');
        throw new Error('Received unknown function ' + ret.fcn + ' invocation');
      }
      let payload = await method(stub, ret.params, this);
      return shim.success(payload);
    } catch (err) {
      console.log(err);
      return err;
    }
    }

    async initLedger(stub){
      manufacturers = {
        "M001":{
          "name": "toyoto",
          "models": [
            "TOmodel1", "TOmodel2", "TOmodel3", "TOmodel4"
          ]
        },
        "M002":{
          "name": "suzuki",
          "models": [
            "SUmodel1", "SUmodel2", "SUmodel3", "SUmodel4"            
          ]
        },
        "M003":{
          "name": "volkswagan",
          "models": [
            "VOmodel1", "VOmodel2", "VOmodel3", "VOmodel4"
          ]
        },
        "M004":{
          "name": "tesla",
          "models": [
            "TEmodel1", "TEmodel2", "TEmodel3", "TEmodel4"
          ]
        },
        "M005":{
          "name": "kia",
          "models": [
            "KImodel1", "KImodel2", "KImodel3", "KImodel4"
          ]
        }
      }
      manucarCount = 0;
      for (const manuID in manufacturers) {
        await stub.putState( manuID, Buffer.from(JSON.stringify(manufacturers[manuID])) )
        await stub.putState( "carCount", Buffer.from(this.manucarCount))
        console.info("added manufacutrer details" + manuID + JSON.stringify(manufacturers[manuID]))
      }
    }
    
    async getManuDetails(stub, manuID){
      const manuAsBYtes = await stub.getState(manuID);
        if (!manuAsBYtes || manuAsBYtes.length === 0) {
            throw new Error(`${manuID} does not exist`);
        }
        console.log(manuAsBYtes.toString());
        return manuAsBYtes.toString();
    }

    async manufactureCar(stub, manuID, model, color){
      // if(this.manufacturers[manuID]["models"].indexOf(model)===-1){
      //   throw new Error(`the selected model ${ model } doesnt exist in the current manufacturer`);
      // }
      let carCountAsBytes = await stub.getState("carCount");
      let manufacturedByManu = await stub.getState("carsManufacturedBy"+manuID);
      if(manufacturedByManu.toString() === ''){
        manufacturedByManu = "[]"
      }
      carCount = parseInt(carCountAsBytes.toString()) + 1
      manufacturedByManu = JSON.parse(manufacturedByManu.toString());
      let car = {
        "carID": carCount.toString(),
        "manu": this.manufacturers[manuID]["name"],
        "model": model,
        "color": color,
        "owner": manuID,
        "forSale": true,
        "dealer": "",
        "request": "" 
      }
    
      await stub.putState(carCount.toString(), Buffer.from(JSON.stringify(car)))
      manufacturedByManu.push(carCount.toString())
      await stub.putState("carsManufacturedBy"+manuID, Buffer.from(JSON.stringify(manufacturedByManu)))
      console.info("generated car with carID" + carCount.toString() + "and with details " + JSON.stringify(car))
    }

    async getManufactuerdCars(stub, manuID){
      let manufactureCars = await stub.getState("carsManufacturedBy"+manuID);
      manufactureCars = manufactureCars.toString();
      console.info("manfactured by "+manuID + " are "+ manufactureCars);
      return manufactureCars;
    }

    async requestManufacturer(stub, dealerID, carID){
      let carAsBytes = stub.getState(carID.toString());
      let car = JSON.parse(carAsBytes.toString());
      car["request"] = dealerID;
      const manuID = car["owner"];
      await stub.putState(carID.toString(), Buffer.from(JSON.stringify(car)));
      //add to cars requested to manufacturer
      let carsRequested = await stub.getState("requestedto"+manuID);
      if(carsRequested.toString() === ''){
        carsRequested = [];
      }
      carsRequested = JSON.parse(carsRequested.toString());
      carsRequested.push((carID));
      await stub.putState("requestedto"+manuID, Buffer.from(JSON.stringify(carsRequested)));
      //remove from cars manufactured,so that no new requests can be made to the same car
      let carsManufacturedBy = await stub.getState("carsManufacturedBy"+manuID);
      if(carsManufacturedBy.toString() === ''){
        carsManufacturedBy = []
      }
      carsManufacturedBy = JSON.parse(carsManufacturedBy);
      for( var i = 0; i < carsManufacturedBy.length; i++){   //removing carID from carsmanufactureded by manufacturer
        if ( carsManufacturedBy[i] === carID) {
          carsManufacturedBy.splice(i, 1); 
        }
      }
      await stub.putState("carsManufacturedBy"+manuID, Buffer.from(JSON.stringify(carsManufacturedBy)))
    }

    async getAllRequestedCars(stub, manuID){
      let carsRequested = await stub.getState("requestedto"+manuID)
      return carsRequested.toString();
    }

    async denyDealerRequest(stub, carID){
      let carAsBytes = stub.getState(carID.toString());
      let car = JSON.parse(carAsBytes.toString());
      let manuID = car["owner"];
      car["request"] = '';
      await stub.putState(carID.toString(), Buffer.from(JSON.stringify(car)));
      //add the car back to the carsmanufactured list
      let manufacturedByManu = await stub.getState("carsManufacturedBy"+manuID);
      if(manufacturedByManu.toString() === ''){
        manufacturedByManu = "[]"
      }
      manufacturedByManu.push(carID);
      await stub.putState("carsManufacturedBy"+manuID, Buffer.from(JSON.stringify(manufacturedByManu)));
      //remove the car from the requests list
      let requestedList = await stub.getState("requestedTo"+manuID);
      if(requestedList.toString() === ''){
        requestedList = []
      }
      requestedList = JSON.parse(requestedList);
      for( var i = 0; i < requestedList.length; i++){     //removing carID from requested list to manufacturer
         if ( requestedList[i] === carID) {
           requestedList.splice(i, 1); 
         }
      }
      await stub.putState("requestedTo"+manuID, requestedList);
    }

    async acceptDealerRequest(stub, carID){ 
      let carAsBytes = stub.getState(carID.toString());
      let car = JSON.parse(carAsBytes.toString());
      let manuID = car["owner"]
      car["owner"] = car["request"];
      car["request"] = '';
      let requestedList = await stub.getState("requestedTo"+manuID);
      let dealerCarsList = await stub.getState("carsByDealers"+car["owner"]);
      if(dealerCarsList.toString() === ''){
        dealerCarsList = []
      }
      if(requestedList.toString() === ''){
        requestedList = []
      }
      dealerCarsList = JSON.parse(dealerCarsList);
      dealerCarsList.push(carID);
      requestedList = JSON.parse(requestedList);
      for( var i = 0; i < requestedList.length; i++){     //removing carID from requested list to manufacturer
         if ( requestedList[i] === carID) {
           requestedList.splice(i, 1); 
         }
      }
      await stub.putState("carsByDealers"+car["owner"], dealerCarsList);  //adding car to carsbydealers
      await stub.putState("requestedTo"+manuID, requestedList);
    }

    async getCarDetails(stub, carID){
      let carAsBytes = stub.getState(carID.toString());
      let car = JSON.parse(carAsBytes.toString());
      return car;
    }

    async requestToBuyFromDealer(stub, customerID, carID){
      let carAsBytes = stub.getState(carID.toString());
      let car = JSON.parse(carAsBytes.toString());
      car["request"] = customerID;
      const dealerID = car["owner"];
      await stub.putState(carID.toString(), Buffer.from(JSON.stringify(car)));
      //add the car to the list of dealer requests
      let carsRequested = await stub.getState("requestedToDealers"+dealerID);
      if(carsRequested.toString()===''){
        carsRequested = []
      }
      carsRequested = JSON.parse(carsRequested.toString())
      carsRequested.push(carID);
      await stub.putState("requestedToDealers"+dealerID, Buffer.from(JSON.stringify(carsRequested)));
      //remove car from list of dealers available cars
      let dealerCarsList = await stub.getState("carsByDealers"+dealerID);
      if(dealerCarsList.toString() === ''){
        dealerCarsList = []
      }
      dealerCarsList = JSON.parse(dealerCarsList);
      for( var i = 0; i < dealerCarsList.length; i++){     //removing carID from dealers car list
        if ( dealerCarsList[i] === carID) {
          dealerCarsList.splice(i, 1); 
        }
      }
      await stub.putState("carsByDealers"+dealerID, dealerCarsList)
    }

    async denyCustomerRequest(stub, carID){
      let carAsBytes = stub.getState(carID.toString());
      let car = JSON.parse(carAsBytes.toString());
      let dealerID = car["owner"];
      car["request"] = '';
      await stub.putState(carID.toString(), Buffer.from(JSON.stringify(car)));
      //add the car back to the dealers list
      let dealerCarsList = await stub.getState("carsByDealers"+dealerID);
      if(dealerCarsList.toString() === ''){
        dealerCarsList = []
      }
      dealerCarsList = JSON.parse(dealerCarsList);
      dealerCarsList.push(carID);
      await stub.putState("carsByDealers"+car["owner"], dealerCarsList);  //adding car to carsbydealers
      //remove the car from the dealers request list
      let carsRequested = await stub.getState("requestedToDealers"+dealerID);
      if(carsRequested.toString()===''){
        carsRequested = []
      }
      carsRequested = JSON.parse(carsRequested.toString())
      for( var i = 0; i < carsRequested.length; i++){
        if ( carsRequested[i] === carID) {
          carsRequested.splice(i, 1); 
        }
      }
      await stub.putState("requestedToDealers"+dealerID, Buffer.from(JSON.stringify(carsRequested)));
    }
} 

module.exports = Chaincode
//exporting the chaincode