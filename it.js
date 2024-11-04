import {
  cloneDeep,
  filter,
  first,
  forOwn,
  has,
  isArray,
  isEmpty,
  isNull,
  isObject,
  isString,
  NaN,
  last,
  size,
  trim,
} from 'lodash';
import React, { useEffect, useState } from 'react';
import loadUnits from '../UnitsLoader';
import { Col, Container, Form, Row } from 'react-bootstrap';
import units from '../../assets/spark/units.json';
import UnitTypes from '../L4Edit/unit-types/UnitTypes';
import Select from 'react-select';
import Datatable from '../L4Edit/data-types/Datatable';
import TypeaheadDropdown from '../L4Edit/data-types/Typeahead';
import JsonSelect from '../L4Edit/data-types/JsonSelect';
import removeChars from '../../utils/removeSpecialChars';
import toast from 'react-hot-toast';

const ModalEdit = (props) => {
  const schema = props.currentEvent.data.templateAttributes;
  const [unitType, setUnitType] = useState(null);
  const [scaling, setScaling] = useState([]);
  const [multiSelect, setMultiSelect] = useState([]);
  const [unitTypeRepo, setUnitTypeRepo] = useState({});
  const [rightElem, setRightElem] = useState(null);
  const [leftElem, setLeftElem] = useState(null);
  const [enableTransform, setEnableTransform] = useState(false);
  const currentEvent = props.currentEvent;
  const templateJSON = props.templateJSON;
  const attributeValues = props.attributeValues;
  const [attributeValue, setAttributeValue] = useState(null);
  const [unitValue, setUnitValue] = useState(null);
  const [attrHasUnits, setAttrHasUnits] = useState(false);
  const [inputType, setInputType] = useState(['string', 'text']);
  const [input, setInput] = useState('');
  const [nextUnit, setNextUnit] = useState();
  const value = currentEvent.data[currentEvent.colDef.field];
  const [dataMatrix, setDataMatrix] = useState(value);
  const [msg, setMsg] = useState('');
  const [typeaheadID, setTypeaheadID] = useState();
  const [typeaheadUpdated, setTypeaheadUpdated] = useState(false);

  //retrieving the units of field from units.js
  const _getUnits = (key) => {
    if (schema.units && !isEmpty(schema['unit-code'])) {
      return units[schema['unit-code']][key];
    }
  };

  useEffect(() => {
    if (
      currentEvent.data.attributeID !== 'LaunchApproverCPCTeam' &&
      currentEvent.data.attributeID !== 'LaunchApproverProductOwner'
    ) {
      if (!isEmpty(schema.hint) && schema.hint) {
        setMsg(schema.hint);
      }

      //assigning the attribute and unit values
      if (!isNull(currentEvent)) {
        let valueSplit = value == null ? [' '] : value.trim().split(' ');
        if (valueSplit[1]) {
          if (valueSplit.length > 2) {
            if (schema['next-code']) {
              setAttributeValue(valueSplit[0]);
              setUnitValue(valueSplit[1]);
              let nxtval = value.split(' ').slice(2).join(' ');
              setNextUnit(nxtval ? nxtval : units[schema['next-code']][0]);
            } else {
              if(schema.rawValue=='removeLastUnit')
              {
                let value=currentEvent.value.substring(0, currentEvent.value.lastIndexOf(" "))
              setAttributeValue(value)
            }
              else
              setAttributeValue(valueSplit.join(' '));
            }
          } else {
            if (schema['unit-code']) {
              setAttrHasUnits(true);
              if (isNaN(valueSplit[1])) {
                setUnitValue(valueSplit[1]);
              } else {
                setUnitValue(_getUnits(valueSplit[1]));
              }
              setAttributeValue(valueSplit[0]);
            } else {
              setAttributeValue(valueSplit.join(' '));
            }
          }
        } else {
          if (schema['next-code']) {
            setAttrHasUnits(true);
            setAttributeValue(valueSplit[0]);
            setUnitValue(units[schema['unit-code']][0]);
            setNextUnit(units[schema['next-code']][0]);
          } else {
            setAttrHasUnits(false);
            setAttributeValue(valueSplit[0]);
          }
        }
      }

      //updating the unit-code and unit-type
      if (schema.units && !isEmpty(schema['unit-code'])) {
        setUnitType(['unit-code', schema['unit-code']]);
        setAttrHasUnits(true);
      }
      if (schema.units && !isEmpty(schema['unit-type'])) {
        setEnableTransform(true);
        setScaling(schema['unit-type']);
      }
      if (schema.multiSelect == true) {
        setInput('multiSelect');

        let selected = [];
        let values = [];
        var separators = [', ', ','];
        selected = value.split(new RegExp(separators.join('|'), 'g'));

        if (!isEmpty(schema.editOptions)) {
          let formatted = [];
          let tempOptions = [];
          forOwn(schema.editOptions, (val, key) => {
            tempOptions.push({ value: val, label: val, key: key });
          });
          selected.forEach(function (val, key) {
            if (val == '64-bit*' || val == '32-bit*') {
              val = selected[key - 1] + ', ' + selected[key];
              formatted.pop();
            }
            formatted.push(val);
          });
          formatted.forEach(function (val, key) {
            var index = tempOptions.findIndex(function (option) {
              return option.value == val;
            });
            values.push(tempOptions[index]);
          });
        }
        setMultiSelect(values);
      } else if (Object.keys(schema).includes('widget')) {
        setInput('widget');
      } else if (schema.PIMFormat == 'DateTime') {
        setInput('date');
      } else if (Object.keys(schema).includes('dataMatrix')) {
        setInput('dataMatrix');
      } else if (Object.keys(schema).includes('typeahead')) {
        setInput('typeahead');
      } else if (Object.keys(schema).includes('selectOptions')) {
        setInput('JsonSelect');
      } else if (Object.keys(schema).includes('next-code')) {
        setInput('MultipleSelect');
      } else if (schema.range == true) {
        setInput('range');
      } else if (schema.rawValue == 'boolean') {
        setInput('bool');
      }
    } else {
      setAttrHasUnits(false);
      setAttributeValue(value);
    }
  }, []);

  const formValueChanged = (e) => {
    setDataMatrix(e);
  };
  //loading units.js
  useEffect(() => {
    setUnitTypeRepo(loadUnits()['units']);
  }, [loadUnits()['units']]);

  function getMonth(monthStr) {
    return new Date(monthStr + '-1-01').getMonth() + 1;
  }

  
  function findParentWithClass(element, className) {
    let parent = element.parentNode;
    while (parent) {
        if (parent.classList?.contains(className)) {
            return parent;
        }
        parent = parent.parentNode;
    }
    return null; 
}

  // updating attribute
  useEffect(() => {
    let leftElem = [];
    if (true) {
      switch (input) {
        case 'date':
          if (isString(attributeValue)) {
            let date = new Date(attributeValue + ' 00:00:00');
            if (!isNaN(date)) {
              var dateString = new Date(
                date.getTime() - date.getTimezoneOffset() * 60000
              )
                .toISOString()
                .split('T')[0];
            } else {
              let splitted = attributeValue
                .split(' ')
                .filter((element) => element);
              let month = getMonth(splitted[0]);
              let year = splitted[2];
              let day = splitted[1];
              if (day < 10) day = '0' + day;
              if (month < 10) month = '0' + month;
              dateString = year + '-' + month + '-' + day;
            }
          }
          leftElem.push(
            <Form.Group as={Col} controlId="my_Unit_units">
              <Form.Control
                type="date"
                value={dateString}
                onKeyPress={handleKeyPress}
                onChange={(e) => {
                  setAttributeValue(e.target.value);
                }}
              ></Form.Control>
            </Form.Group>
          );
          break;
        case 'dataMatrix':
          leftElem.push(
            <Form.Group as={Col} style={{ width: 700 }} controlId="DataMatrix">
              <Datatable
                value={dataMatrix}
                onChange={(e) => {
                  formValueChanged(e);
                }}
                schema={schema}
              ></Datatable>
            </Form.Group>
          );
          break;
        case 'typeahead':
          leftElem.push(
            <Form.Group as={Col} controlId="TypeAhead">
              <TypeaheadDropdown
                onChange={(e) => {
                  setTypeaheadUpdated(true);
                  setTypeaheadID(e.split('_')[1]);
                  setAttributeValue(e.split('_')[0]);
                }}
                schema={schema}
                value={attributeValue}
              ></TypeaheadDropdown>
            </Form.Group>
          );
          break;
        case 'JsonSelect':
          leftElem.push(
            <Form.Group as={Col} controlId="JsonSelect" className="w-auto">
              <JsonSelect
                onChange={(e) => {
                  setAttributeValue(e);
                }}
                schema={schema}
                value={attributeValue}
              ></JsonSelect>
            </Form.Group>
          );
          break;
        case 'multiSelect':
          function findIndex(tempOptions) {
            let selected = [];
            let values = [];
            let formatted = [];
            var separators = [', ', ','];
            selected = attributeValue.split(
              new RegExp(separators.join('|'), 'g')
            );
            selected.forEach(function (val, key) {
              if (val == '64-bit*' || val == '32-bit*') {
                val = selected[key - 1] + ', ' + selected[key];
                formatted.pop();
              }
              formatted.push(val);
            });
            formatted.forEach(function (val, key) {
              var index = tempOptions.findIndex(function (option) {
                return option.value == val;
              });
              values.push(tempOptions[index]);
            });
            return values;
          }
          if (!isEmpty(schema.editOptions)) {
            let tempOptions = [];
            forOwn(schema.editOptions, (val, key) => {
              tempOptions.push({ value: val, label: val, key: key });
            });
            leftElem.push(
              <Form.Group
                as={Col}
                style={{ width: 700 }}
                controlId="my_multiselect_field"
              >
                <Select
                  styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
                  menuPortalTarget={document.body}
                  menuPosition="fixed"
                  style={{ margin: 20, width: 300, padding: 50 }}
                  closeMenuOnSelect={false}
                  defaultValue={attributeValue ? findIndex(tempOptions) : null}
                  isMulti
                  options={tempOptions}
                  onChange={(e) => {
                    setMultiSelect(e);
                  }}
                />
              </Form.Group>
            );
          }
          break;
        case 'select':
          if (!isEmpty(schema.enum)) {
            leftElem.push(
              <Form.Group as={Col} controlId="my_Unit_units">
                <Form.Control
                  as="select"
                  style={{ width: 180 }}
                  value={trim(attributeValue)}
                  onChange={(e) => {
                    setAttributeValue(e.target.value);
                  }}
                >
                  {schema.enum.map((val, key) => (
                    <option value={val} key={key + Math.random()}>
                      {val}
                    </option>
                  ))}
                </Form.Control>
              </Form.Group>
            );
          }
          break;
        case 'widget':
          leftElem.push(
            <Form.Group as={Col} controlId="my_Unit_units">
              <textarea
                rows="5"
                style={{ resize: 'both' }}
                value={trim(attributeValue)}
                onChange={(e) => {
                  setAttributeValue(e.target.value);
                }}
              ></textarea>
            </Form.Group>
          );
          break;
        default: // default is string
          leftElem.push(
            <Form.Group as={Col} controlId="my_Unit_units">
              <Form.Control
                as="input"
                className='bulk_input'
                value={attributeValue}
                onKeyPress={handleKeyPress}
                onChange={(e) => {
                  let value = e.target.value
                  let element = document.getElementsByClassName('bulk_input');
                  if(schema?.['validation'] === 'numeric' && isNaN(value)){
                    element[0].classList.add('bg_error_compare')
                    currentEvent['isValid']= false
                    console.log('elemt',element[0].classList,schema,value)
                  }
                  if(!isNaN(value) || value.length == 0 ){
                    element[0].classList.remove('bg_error_compare')
                    currentEvent['isValid']= true
                  }
                  setAttributeValue(value);
                }}
              ></Form.Control>
            </Form.Group>
          );
          break;
      }
    }
    setLeftElem(leftElem);
  }, [attributeValue, inputType, dataMatrix, multiSelect]);

  //updating units
  useEffect(() => {
    let nextOptions = [];
    let templRightElem = [];
    if (!isNull(unitType) && attrHasUnits) {
      if (isObject(units[unitType[1]])) {
        let tempOptions = [];
        forOwn(units[unitType[1]], (val, key) => {
          tempOptions.push(
            <option value={key} key={key + Math.random()}>
              {units[unitType[1]][key]}
            </option>
          );
        });
        if (schema['next-code']) {
          templRightElem.push(
            <>
              <Form.Group as={Col} value={unitValue} controlId="my_Unit_units">
                <Form.Select
                  style={{ width: '48%', display: 'inline' }}
                  value={unitValue}
                  onChange={(e) => {
                    setUnitValue(e.target.value);
                  }}
                >
                  {tempOptions.map((val, index) => (
                    <option>{val}</option>
                  ))}
                </Form.Select>
                <Form.Select
                  style={{ width: '48%', float: 'right', display: 'inline' }}
                  value={nextUnit}
                  onChange={(e) => {
                    setNextUnit(e.target.value);
                  }}
                  disabled={schema['next-code'] ? false : true}
                >
                  {Object.values(units[schema['next-code']]).map((val, key) => (
                    <option value={val} key={key + Math.random()}>
                      {val}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </>
          );
        } else {
          templRightElem.push(
            <>
              <Form.Group as={Col} value={unitValue} controlId="my_Unit_units">
                <Form.Select
                  value={unitValue}
                  onChange={(e) => {
                    setUnitValue(e.target.value);
                  }}
                >
                  {tempOptions.map((val, index) => (
                    <option>{val}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </>
          );
        }

        setRightElem(templRightElem);
      } else if (has(units, unitType[1])) {
        templRightElem.push(
          <Form.Group as={Col} controlId="my_Unit_units">
            <Form.Control
              as="input"
              value={units[unitType[1]]}
              disabled
            ></Form.Control>
          </Form.Group>
        );

        setRightElem(templRightElem);
      }
    }
  }, [unitValue, unitType, nextUnit]);

  //close functionality
  function closeModal() {
    props.onCloseModal([attributeValue, unitValue], currentEvent);
  }
  // save functionality
  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      saveModal();
    }
  };
  function handleDate(value) {
    if (isEmpty(value)) return '';
    else {
      const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      };
      let temp = new Date(value + ' 00:00:00');
      let convert = temp.toLocaleDateString(undefined, options);
      return convert;
    }
  }
  function saveModal() {
    let x =
      unitValue == null && !isEmpty(unitType)
        ? isObject(units[unitType[1]])
          ? units[unitType[1]][0]
          : units[unitType[1]]
        : unitValue;

    let value = attributeValue + ' ' + x;
    if(currentEvent['isValid'] == false){
       toast.error('Error: This field accepts numerical values only, please correct it before saving.', {
          position: 'top-right',
          minWidth: '500px',
          color: '#d1f0fd',
        });
      return;
    }
    
    if (
      (attributeValue == 0 || isEmpty(attributeValue)) &&
      isEmpty(multiSelect) &&
      input != 'dataMatrix' &&
      !isNull(unitType) &&
      unitType[1] === 'cel' &&
      attributeValue == ''
    ) {
      value = '';
      props.onSaveModal([value], currentEvent);
      return;
    }
    switch (input) {
      case 'date': {
        props.onSaveModal(
          [handleDate(attributeValue), unitValue],
          currentEvent
        );
        return;
      }

      case 'dataMatrix': {
        var fd;
        try {
          fd = JSON.parse(dataMatrix);
        } catch (e) {
          fd = [];
        }
        var col = props.currentEvent.data.templateAttributes.column;

        var kd = [];
        for (let i = 0; i < fd.length; i++) {
          let push = false;
          for (let j = 0; j < col.length; j++) {
            if (fd[i][col[j]] !== '') {
              push = true;
            }
          }
          if (push === true) {
            kd.push(fd[i]);
          }
        }
        let valueToSave = '';
        if(kd.length>0){
          valueToSave = JSON.stringify(kd);
        }else{
          valueToSave = '';
        }
        props.onSaveModal([valueToSave, ''], currentEvent);
        return;
      }
      case 'typeahead': {
        if (typeaheadUpdated == true) {
          props.onSaveModal([attributeValue, typeaheadID], currentEvent);
          return;
        } 
        else {
          props.onSaveModal([attributeValue, currentEvent.data[attributeValue]], currentEvent);
          return;
        }
      }
      case 'multiSelect': {
        let selected = [];
        multiSelect.forEach(function (val, key) {
          selected.push(val.value);
        });
        let multiValues = '';
        multiValues = !isEmpty(selected) ? selected.join(', ') : '';
        setAttributeValue();
        props.currentEvent.data.templateAttributes.rawValue=='getMappedRawValue' ? props.onSaveModal([multiValues], currentEvent, selected):
        props.onSaveModal([multiValues], currentEvent);
        return;
      }
    }
    //scaling
    if (enableTransform && !isEmpty(unitType) && !isEmpty(x) && attributeValue !=='') {
      var doublenumber = 0;
      var valUnit = '';
      if (isString(value)) {
        doublenumber = Number(value.replace(/[^0-9\.]+/g, ''));
      }

      let val = null;
      switch (scaling) {
        case 'SpeedToString':
          val = UnitTypes.SpeedToString(doublenumber, x, true);
          break;
        case 'SizeToString':
          val = UnitTypes.SizeToString(doublenumber, true, x, unitType);
          break;
        case 'VersiontoBool':
          val = UnitTypes.VersiontoBool(doublenumber, x, true);
          break;
        default:
          break;
      }
      val = val.split(' ');
      let AttributeValue = Number(val[0]);
      let UnitValue = val[1];
      if (input == 'MultipleSelect' && nextUnit != undefined ) {
        props.onSaveModal([AttributeValue, UnitValue, nextUnit], currentEvent);
      } else {
        AttributeValue == '' || AttributeValue == 0? props.onSaveModal([''], currentEvent):
        props.onSaveModal([AttributeValue, UnitValue], currentEvent);
      }
    } else {
      if(attributeValue == '')
      props.onSaveModal([attributeValue], currentEvent);
      else
      props.onSaveModal([attributeValue, x], currentEvent);
    }
  }

  return (
    <div>
      <div className="row mb-4 mt-2">
        <div className="col-sm-auto">{leftElem}</div>
        {rightElem ? (
          <div className="col-sm-auto mr-0">{rightElem}</div>
        ) : (
          <div></div>
        )}
      </div>
      {msg ? (
        <div
          className="msgUnits col-sm-auto"
          style={{ align: 'center', width: 500 }}
        >
          <span dangerouslySetInnerHTML={{ __html: msg }} />
        </div>
      ) : null}
      <div className="container">
        <div className="row">
          <button className="btn btn-sm btn-primary mb-1" onClick={saveModal}>
            Save
          </button>
          <button className="btn btn-sm btn-secondary" onClick={closeModal}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalEdit;
