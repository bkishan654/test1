import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
  Component,
} from 'react';
import { Table, Button } from 'react-bootstrap';
import { AgGridReact } from 'ag-grid-react'; // the AG Grid React Component
import toast, { Toaster } from 'react-hot-toast';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import BootstrapSwitchButton from 'bootstrap-switch-button-react';
import 'ag-grid-community/dist/styles/ag-grid.css'; // Core grid CSS, always needed
import 'ag-grid-community/dist/styles/ag-theme-alpine.css'; // Optional theme CSS
import {
  cloneDeep,
  forOwn,
  isEmpty,
  isObject,
  isEqual,
  set,
  isNull,
  size,
  forEach,
  find,
  trim,
  isUndefined,
  pickBy,
  isString,
} from 'lodash';
import loadTemplates from '../TemplateLoader';
import Modal from 'react-modal';

import ProductNameRenderer from './ProductNameRenderer';
import ProductCountRenderer from './ProductCountRenderer';
import characteristicsTasks from '../../services/api/tasks/characteristicsTasks';
import '../../styles/bulk-edit.css';
import ModalEdit from './ModalEdit';
import productAttributeTasks from '../../services/api/tasks/productAttributeTasks';
import ValueRenderer from './ValueRenderer';
import DataFormatter from './DataFormatter';
import '../../styles/L4Page.css';
import Compare from '../Compare/Compare';
import CommonSearch from '../SearchPage/commonSearch';
import RowFormatter from './RowFormatter';
import Loader from '../../shared/Loader/Loader';
import AttributeValueConversion from '../L4Edit/RawValues';
import productListTasks from '../../services/api/tasks/ProductListTasks';
import mmAttributeTasks from '../../services/api/tasks/mmAttributeTasks';
import PublishModal from './PublishModal';
import { GridApi } from 'ag-grid-community';
import { rolesInfo } from '../../services/graphapi/roles';
import { encryptText, decryptText } from '../../services/aes';
import { checkRoles, sortuserrole } from '../../services/agsRoles';
import removeChars from '../../utils/removeSpecialChars';
import getArkRefreshDate from '../../utils/arkRefreshDate';
import { event } from 'jquery';
import * as XLSX from 'xlsx';
//refactor code: https://dev.to/mmcshinsky/a-simple-approach-to-managing-api-calls-1lo6

let calLoader;
let currEvent;
let initialData;

const BulkEditGrid = () => {
  const gridRef = useRef(); // Optional - for accessing Grid's API
  const [newRowDataA, setNewRowDataA] = useState([]); // Set rowData to Array of Objects, one Object per Row
  const [columnData, setColumnData] = useState([]); // Set rowData to Array of Objects, one Object per Row
  const [loadingColumnData, setLoadingColumnData] = useState(true);
  const [loadingRowData, setLoadingRowData] = useState(true);
  const [bulkEditEnabled, setbulkEditEnabled] = useState(false); // Set rowData to Array of Objects, one Object per Row
  const [highlightDiffCols, sethighlightDiffCols] = useState(true); // Set rowData to Array of Objects, one Object per Row
  const [reloadData, setreloadData] = useState(0); // Set rowData to Array of Objects, one Object per Row
  const [searchParams, setSearchParams] = useSearchParams();
  const pimRESTGw = process.env.REACT_APP_PIM_PREPROD_BASE_URL;
  const username = process.env.REACT_APP_API_USERNAME;
  const password = decryptText(process.env.REACT_APP_API_PASSWORD);
  const [productType, setProductType] = useState(null);
  const [templateType, setTemplateType] = useState(null);
  const [template, setTemplate] = useState([]);
  const [attributeValues, setAttributeValues] = useState(null);
  const [modalIsOpen, setIsOpen] = useState(false);
  const [currentClickEvent, setCurrentClickEvent] = useState(null);
  const [templateRowData, setTemplateRowData] = useState([]); // Set rowData to Array of Objects, one Object per Row
  const [checkList, setCheckList] = useState([]);
  const [didMount, setDidMount] = useState(false);
  const [loader, setLoader] = useState(true);
  const [isPublish, setIsPublish] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [fieldsData, setFieldsData] = useState([]);
  const [MMData, setMMData] = useState({});
  const bDate = useRef();
  const productListData = useRef([]);
  const [mediaAssetsLoaded, setMediaAssetsLoaded] = useState(false);
  const [allAttributes, setAllAtributes] = useState([]);
  const [templateBasedAttributes, setTemplateBasedAttributes] = useState([]);
  const [listForBulk, setListForBulk] = useState([]);
  const [invalidProducts, setInvalidProducts] = useState([]);
  const [launchDate, setLaunchDate] = useState([]);
  const [bornOnDate, setBornOnDate] = useState([]);
  const rowHeight = '30';
  const isSystemAdmin = checkRoles(
    'SPARK Product Management System Admin',
    rolesInfo.roles
  );
  const [PinnedTopRowData, setpinnedTopRowData] = useState([]);
  const roleRank = sortuserrole(rolesInfo.roles);
  var pinnedRowData = [];
  const attributesToPinned = [
    'ProductGroup',
    'StatusCodeText',
    'LaunchDate',
    'BornOnDate',
    'CodeNameText',
    'LaunchApproverCPCTeam',
    'LaunchApproverProductOwner',
  ];
  let newBornOnDate, newLaunchDate;
  async function calculateRL() {
    calLoader = toast.loading('Calculating...', {
      className: 'toast-loader',
      position: 'top-right',
      minWidth: '500px',
      style: {
        color: 'black',
        fontSize: '18px',
      },
      iconTheme: {
        primary: '#000',
      },
    });

    let fieldObj = [];
    let MMObj = {};

    let fields =
      'Article.SupplierAID,ArticleLang.DescriptionShort(English, 1033),Article.RestrictionLevel, ArticleAttributeValue.AdditionalValue("RestrictionLevel",English,"en-US"), ArticleAttributeValue.RawValueDec("RestrictionLevel",English,"en-US"), ArticleAttributeValue.RawValueExtended("RestrictionLevel",English,"en-US"), ArticleAttributeValue.RawValueExtended("RestrictionLevel",English,"en-US"), ArticleAttributeValue.AdditionalValue("StatusCodeText",English,"en-US"), ArticleAttributeValue.RawValueExtended("StatusCodeText",English,"en-US"), ArticleAttributeValue.RawValueExtended("ProductType",English,"en-US"), ArticleAttributeValue.AdditionalValue("LaunchApproverProductOwner",English,"en-US"), ArticleAttributeValue.AdditionalValue("LaunchApproverCPCTeam",English,"en-US"), Article.IsUnderEmbargo, Article.EmbargoDate';

    const res1 = await productAttributeTasks.getArticleLevelData(
      checkList.join('","'),
      username,
      password,
      fields,
      -1
    );

    if (res1.rowCount > 0) {
      res1.rows.forEach((row) => {
        let currResLevel;
        let res1Data = row.values;
        let objId = row.object.id;
        let RLArr = res1Data.slice(2, 7);
        let level = [...new Set(RLArr)];
        if (level.length === 1) {
          if (level[0]) {
            if (!(level[0] >= 0 && level[0] < 4)) {
              currResLevel = 'Invalid';
            } else {
              currResLevel = RLArr[0];
            }
          } else {
            currResLevel = 'Invalid';
          }
        } else {
          currResLevel = 'Invalid';
        }
        fieldObj.push([
          objId,
          res1Data[0],
          res1Data[1],
          currResLevel,
          ...res1Data.slice(7),
        ]);
      });
    }
    const res2 = await mmAttributeTasks.getMMLists(
      checkList.join('","'),
      username,
      password,
      -1
    );

    if (res2.rowCount > 0) {
      let mmData = [];
      let productID = '';
      res2.rows.forEach((row) => {
        productID = row.object.label;
        if (MMObj[productID] === undefined) {
          mmData = [];
          productID = row.object.label;
        }
        mmData.push(row.values[1].split('M')[1]);
        MMObj[productID] = mmData;
      });
    }

    setFieldsData(fieldObj);
    setMMData(MMObj);
    setShowPublishModal(true);
  }

  const onClickpublish = () => {
    setIsPublish(true);
    calculateRL();
  };

  const modalCustomStyles = {
    content: {
      top: '40%',
      left: '50%',
      right: 'auto',
      bottom: 'auto',
      marginRight: '-50%',
      transform: 'translate(-50%, -50%)',
    },
  };

  // DefaultColDef sets props common to all Columns
  const defaultColDef = useMemo(() => ({
    sortable: false,
    wrapText: true,
    autoHeight: true,
  }));

  // Example of consuming Grid Event
  const cellClickedListener = useCallback((event) => {
    var checkedCount = JSON.parse(localStorage.getItem('checkList'));

    //disable modal on root chars
    if (
      event.data.attributeID === 'root' ||
      event.colDef.field === `${checkedCount.length} Products`
    ) {
      return;
    }
    setCurrentClickEvent(event);
    currEvent = event;
  }, []);

  const navigate = useNavigate();

  useEffect(() => {
    setDidMount(true);
  }, []);

  useEffect(() => {
    setLoader(true);
    if (didMount) {
      window.localStorage.setItem('checkList', JSON.stringify(checkList));
      if (checkList.length === 0) {
        navigate('../bulk-edit');
      }
    }
  }, [checkList]);

  useEffect(() => {
    const items = searchParams.get('items');
    if (items) {
      setLoader(true);
      const arrList = [...new Set(items.split(','))];
      setCheckList(arrList);
    } else {
      setCheckList([]);
    }
  }, [searchParams]);

  useEffect(() => {
    if (
      currentClickEvent?.data?.attributeID == 'LaunchApproverCPCTeam' &&
      !isEmpty(currentClickEvent.value)
    ) {
      roleRank < 2 ? openModal() : closeModal();
    } else if (
      !isNull(currentClickEvent) &&
      currentClickEvent?.data?.attributeID == 'LaunchApproverCPCTeam' &&
      isEmpty(currentClickEvent.value)
    ) {
      if (roleRank < 2) {
        CPCApproval(currentClickEvent.colDef.field);
      }
    } else if (
      currentClickEvent?.data?.attributeID == 'LaunchApproverProductOwner' &&
      !isEmpty(currentClickEvent.value)
    ) {
      roleRank < 4 ? openModal() : closeModal();
    } else if (
      !isNull(currentClickEvent) &&
      currentClickEvent?.data?.attributeID == 'LaunchApproverProductOwner' &&
      isEmpty(currentClickEvent.value)
    ) {
      if (roleRank < 4) {
        CPCApproval(currentClickEvent.colDef.field);
      }
    } else {
      if (
        currentClickEvent?.data?.attributeID == 'LaunchApproverProductOwner'
      ) {
        closeModal();
      } else if (
        !isNull(currentClickEvent) &&
        currentClickEvent?.data?.templateAttributes['non-editable'] !== true
      ) {
        let productID = currentClickEvent.colDef.field;
        let attrName = currentClickEvent.data.attributeID;
        let attrObj = find(attributeValues[productID], { label: attrName });
        let templateData = template['template' + attrObj?.template[productID]];
        if (templateData != undefined)
          Object.keys(templateData['properties']).forEach(function (key) {
            Object.keys(templateData['properties'][key]['properties']).forEach(
              function (value) {
                if (value === attrObj.label) {
                  openModal();
                } else {
                  setListForBulk([]);
                }
              }
            );
          });
      } else {
        setListForBulk([]);
        closeModal();
      }
    }
    if (bulkEditEnabled) {
      let attrExist;
      forEach(checkList, (productID) => {
        if (!isNull(currentClickEvent)) {
          let attrObj = find(attributeValues[productID], {
            label: currentClickEvent?.data?.attributeID,
          });
          let templateData =
            template['template' + attrObj?.template[productID]];
          if (templateData != undefined)
            Object.keys(templateData['properties']).forEach(function (key) {
              Object.keys(
                templateData['properties'][key]['properties']
              ).forEach(function (value) {
                if (value === attrObj.label) {
                  if (!listForBulk.includes(productID)) {
                    setListForBulk((prev) => [...prev, productID]);
                  }
                  attrExist = true;
                }
              });
            });
        }
        if (
          currentClickEvent.data.attributeID === 'LaunchApproverCPCTeam' ||
          currentClickEvent.data.attributeID === 'LaunchApproverProductOwner'
        ) {
          if (!listForBulk.includes(productID)) {
            setListForBulk((prev) => [...prev, productID]);
          }
          attrExist = true;
        }
      });
    }
  }, [currentClickEvent]);

  function openModal() {
    setIsOpen(true);
  }

  function afterOpenModal() {
    // references are now sync'd and can be accessed.
  }

  function closeModal() {
    setIsOpen(false);
    setListForBulk([]);
  }

  let extract = [],
    extractWireless = [],
    list = [],
    listWireless = [];
  let processorID, wirelessID;
  const getL4Data = async (id, name) => {
    let response = await productAttributeTasks.getProductAttributes(
      id,
      process.env.REACT_APP_API_USERNAME,
      decryptText(process.env.REACT_APP_API_PASSWORD)
    );
    let newdataProcessor = [],
      newdataWireless = [];
    if (response.rowCount > 0) {
      forOwn(response.rows, (object, key) => {
        if (
          extract.includes(object.qualification.name) &&
          name == 'ProcessorIncluded'
        ) {
          let data = {
            [object.qualification.name]: object.values[2],
          };
          newdataProcessor.push(data);
        } else if (
          extractWireless.includes(object.qualification.name) &&
          name == 'WirelessIncluded'
        ) {
          let data = {
            [object.qualification.name]: object.values[2],
          };
          newdataWireless.push(data);
        }
      });
    }
    if (name == 'ProcessorIncluded') return newdataProcessor;
    else return newdataWireless;
  };
  async function saveModal(values, currentEvent, multiValsForOS) {
    let apiSave;
    let updatedValue = values[1] !== null ? values.join(' ') : values[0];
    setIsOpen(false);
    let productID = currentClickEvent.colDef.field;
    let attrName = currentClickEvent.data.attributeID;
    let attrObj = find(attributeValues[productID], { label: attrName });
    let templateData = template['template' + attrObj?.template[productID]];
    let val = updatedValue.split(' ').pop();
    if (
      currentEvent.data.attributeID === 'ProcessorIncluded' ||
      currentEvent.data.attributeID === 'WirelessIncluded'
    ) {
      if (currentEvent.data.attributeID === 'ProcessorIncluded')
        processorID = val;

      if (currentEvent.data.attributeID === 'WirelessIncluded')
        wirelessID = val;

      if (templateData != undefined)
        Object.keys(templateData['properties']).forEach(function (key) {
          Object.keys(templateData['properties'][key]['properties']).forEach(
            (subKey) => {
              if (
                templateData['properties'][key]['properties'][subKey][
                  'extract-from'
                ] === 'ProcessorIncluded'
              ) {
                extract.push(subKey);
              }
              if (
                templateData['properties'][key]['properties'][subKey][
                  'extract-from'
                ] === 'WirelessIncluded'
              ) {
                extractWireless.push(subKey);
              }
            }
          );
        });
      list = processorID
        ? await getL4Data(processorID, 'ProcessorIncluded')
        : '';
      listWireless = wirelessID
        ? await getL4Data(wirelessID, 'WirelessIncluded')
        : '';
    }

    if (
      currentEvent.data.attributeID === 'LaunchApproverCPCTeam' ||
      currentEvent.data.attributeID === 'LaunchApproverProductOwner'
    ) {
      CPCApproval(currentEvent.colDef.field, updatedValue, currentEvent);
    } else {
      let conversion = currentEvent.data.templateAttributes.rawValue;
      let code = currentEvent.data.templateAttributes['unit-code'];
      let volatile = currentEvent.data.templateAttributes.isVolatitle;
      let object = currentEvent.data.templateAttributes.unitObject;
      let rowObj = {};
      let reqBody = [];
      let otherVals = [];
      let extendedValue = null;
      let decimalValue = null;
      forOwn(attributeValues[currentEvent.colDef.field], (row, key) => {
        if (row.label == currentEvent.data.attributeID) {
          rowObj.object = row.object;
          rowObj.qualification = row.qualification;
          if (isEmpty(rowObj.qualification.identifier)) {
            delete rowObj.qualification.identifier;
          }
          otherVals =
            conversion != 'undefined'
              ? AttributeValueConversion(
                  conversion,
                  updatedValue,
                  code,
                  volatile,
                  object,
                  multiValsForOS
                )
              : [updatedValue, ''];
        }
        if (isNaN(updatedValue) && conversion !== 'undefined') {
          updatedValue = updatedValue;
          extendedValue = otherVals[0];
          decimalValue = otherVals[1];
        } else {
          extendedValue = updatedValue;
          decimalValue = updatedValue;
        }
      });
      if (currentEvent?.data?.templateAttributes?.typeahead === true) {
        let newVal = updatedValue;
        let id = newVal.split(' ').pop();
        let data = newVal.replace(id, '').trim();
        extendedValue = id;
        decimalValue = id;
        updatedValue = data;
        if (id == '') {
          updatedValue = '';
        }
      }
      if (!isEmpty(rowObj)) {
        reqBody.push(rowObj);
      }
      let prodsToSave = bulkEditEnabled
        ? listForBulk
        : [currentEvent.colDef.field];
      apiSave = saveToPIM(
        currentEvent.data.attributeID,
        updatedValue,
        prodsToSave,
        extendedValue,
        decimalValue
      );
    }
    if (apiSave) {
      const itemsToUpdate = [];
      gridRef.current.api.forEachNodeAfterFilterAndSort(function (
        rowNode,
        index
      ) {
        // only do first 2
        if (rowNode.data.attributeID == currentEvent.data.attributeID) {
          const data = rowNode.data;
          if (bulkEditEnabled) {
            forEach(listForBulk, (productId) => {
              if (currentEvent?.data?.templateAttributes?.typeahead === true)
                data[productId] = values[1] != undefined ? values[0] : '';
              else data[productId] = values.join(' ');
            });
          } else if (
            currentEvent?.data?.templateAttributes?.typeahead === true
          ) {
            data[currentEvent.colDef.field] =
              values[1] != undefined ? values[0] : '';
          } else {
            data[currentEvent.colDef.field] = values.join(' ');
          }
          itemsToUpdate.push(data);
        }

        if (
          currentEvent.data.attributeID === 'ProcessorIncluded' &&
          extract.includes(rowNode.data.attributeID)
        ) {
          let obj = rowNode.data;
          let newVal;
          if (bulkEditEnabled) {
            forEach(listForBulk, (productID) => {
              if (processorID == '') {
                obj[productID] = '';
              } else {
                if (list.length == 0) {
                  obj[productID] = '';
                } else {
                  newVal = list.find((a) => a[rowNode.data.attributeID]);
                  obj[productID] =
                    newVal == undefined ? '' : newVal[rowNode.data.attributeID];
                }
              }
              itemsToUpdate.push(obj);
            });
          } else {
            if (processorID == '') {
              obj[currentEvent.colDef.field] = '';
            } else {
              if (list.length == 0) {
                obj[currentEvent.colDef.field] = '';
              } else {
                newVal = list.find((a) => a[rowNode.data.attributeID]);
                obj[currentEvent.colDef.field] =
                  newVal == undefined ? '' : newVal[rowNode.data.attributeID];
              }
            }
            itemsToUpdate.push(obj);
          }
        }
        if (
          currentEvent.data.attributeID === 'WirelessIncluded' &&
          extractWireless.includes(rowNode.data.attributeID)
        ) {
          let obj = rowNode.data;
          let newVal;
          if (bulkEditEnabled) {
            forEach(listForBulk, (productID) => {
              if (wirelessID == '') {
                obj[productID] = '';
              } else {
                if (listWireless.length == 0) {
                  obj[productID] = '';
                } else {
                  newVal = listWireless.find(
                    (a) => a[rowNode.data.attributeID]
                  );
                  obj[productID] =
                    newVal == undefined ? '' : newVal[rowNode.data.attributeID];
                }
              }
              itemsToUpdate.push(obj);
            });
          } else {
            if (wirelessID == '') {
              obj[currentEvent.colDef.field] = '';
            } else {
              if (listWireless.length == 0) {
                obj[currentEvent.colDef.field] = '';
              } else {
                newVal = listWireless.find((a) => a[rowNode.data.attributeID]);
                obj[currentEvent.colDef.field] =
                  newVal == undefined ? '' : newVal[rowNode.data.attributeID];
              }
            }
            itemsToUpdate.push(obj);
          }
        }

        if (
          currentEvent.data.attributeID === 'OperatingTemperatureMin' ||
          currentEvent.data.attributeID === 'OperatingTemperatureMax'
        ) {
          if (bulkEditEnabled) {
            forEach(listForBulk, (productId) => {
              let minobj = find(attributeValues[productId], {
                label: 'OperatingTemperatureMin',
              });
              let maxobj = find(attributeValues[productId], {
                label: 'OperatingTemperatureMax',
              });
              if (rowNode.data.attributeID == 'OperatingTemperature') {
                const range = rowNode.data;
                if (values[0] === '' && values[0] !== 0) {
                  range[productId] = '';
                } else {
                  range[productId] =
                    currentEvent.data.attributeID === 'OperatingTemperatureMin'
                      ? values.join(' ') + ' to ' + maxobj.value
                      : minobj.value + ' to ' + values.join(' ');
                }
                itemsToUpdate.push(range);
              }
            });
          } else {
            let minobj = find(attributeValues[currentEvent.colDef.field], {
              label: 'OperatingTemperatureMin',
            });
            let maxobj = find(attributeValues[currentEvent.colDef.field], {
              label: 'OperatingTemperatureMax',
            });

            if (rowNode.data.attributeID == 'OperatingTemperature') {
              const range = rowNode.data;
              if (values[0] === '') {
                range[currentEvent.colDef.field] = '';
              } else {
                range[currentEvent.colDef.field] =
                  currentEvent.data.attributeID === 'OperatingTemperatureMin'
                    ? values.join(' ') + ' to ' + maxobj.value
                    : minobj.value + ' to ' + values.join(' ');
              }
              itemsToUpdate.push(range);
            }
          }
        }
        if (
          currentEvent.data.attributeID === 'BornOnDate' &&
          rowNode.data.attributeID == 'LaunchDate'
        ) {
          if (bulkEditEnabled) {
            forEach(listForBulk, (productId) => {
              if (
                rowNode.data[productId] == '' ||
                rowNode.data[productId] == ' '
              ) {
                rowNode.data[productId] = newLaunchDate;
                itemsToUpdate.push(rowNode.data);
              }
            });
          } else {
            if (
              rowNode.data[productID] == '' ||
              rowNode.data[productID] == ' '
            ) {
              rowNode.data[productID] = newLaunchDate;
              itemsToUpdate.push(rowNode.data);
            }
          }
        }
      });
      const res = gridRef.current.api.applyTransaction({
        update: itemsToUpdate,
      });
    }
    list = [];
    listWireless = [];
    setListForBulk([]);
  }

  function modalValueChanged(val) {
    setIsOpen(val);
  }

  //Api Call for the bulkEdit Media Assets
  const getProductData = async () => {
    setLoader(true);
    let allProdIds = [];
    checkList.map((id) =>
      allProdIds.push(
        productListTasks.getL4MediaAssets(
          id,
          process.env.REACT_APP_PIM_API_USERNAME,
          decryptText(process.env.REACT_APP_PIM_API_PASSWORD),
          'pim_micro'
        )
      )
    );
    Promise.all(allProdIds)
      .then((response) => {
        productListData.current = response;
        setMediaAssetsLoaded(true);
      })
      .catch((err) => {
        console.error(err);
      });
  };

  useEffect(() => {
    if (checkList.length > 0) {
      getProductData();
    }
  }, [checkList, reloadData]);

  useEffect(() => {
    if (checkList.length > 0) {
      setLoader(true);
      _getColumnDef(checkList);
    }
  }, [reloadData, checkList]);

  //build Column Defs
  const _getColumnDef = async () => {
    let promises = [];
    let columnDef = [];

    columnDef.push(_addProductCountColumn(checkList.length));
    for (let k = 0; k < checkList.length; k++) {
      promises.push(
        characteristicsTasks
          .getProductName(checkList[k], username, password)
          .then((res) => {
            if (res.rowCount == 0) {
              // ERROR
              toast.error('Invalid Product ID - ' + checkList[k] + '.', {
                position: 'top-right',
                minWidth: '500px',
              });
            } else {
              columnDef.push(_getProductColumn(checkList[k], res));
            }
          })
      );
    }

    Promise.all(promises).then(() => {
      //column data is fetched async so oder the column from the input column list
      columnDef.sort(function (a, b) {
        return checkList.indexOf(a.field) - checkList.indexOf(b.field);
      });
      setColumnData(columnDef);
      setLoadingColumnData(false);
    });
  };
  useEffect(() => {
    if (!loadingColumnData && !loadingRowData) {
      toast.success('Product data loaded', {
        position: 'top-right',
        minWidth: '500px',
        color: '#d1f0fd',
      });
    }
  }, [loadingColumnData, loadingRowData]);

  useEffect(() => {
    setTemplate(loadTemplates());
    setTemplateType('template' + productType);
  }, [productType]);

  // build attribute values
  useEffect(() => {
    setLoader(true);
    if (checkList != null && mediaAssetsLoaded) {
      let promises = [];
      let allProdAttrs = {};
      let tempInvalidProd = [];
      forEach(checkList, (val, key) => {
        promises.push(
          productAttributeTasks
            .getProductAttributes(val, username, password)
            .then((response) => {
              return new Promise((resolve, reject) => {
                resolve([val, response]);
              });
            })
        );
      });

      Promise.all(promises).then((responseData) => {
        let templateIds = {};
        let templateAttributes = [];
        let tempArray = [];

        forEach(responseData, (response) => {
          allProdAttrs[response[0]] = [];
          templateIds[response[0]] = '';
          if (response[1].rowCount > 0) {
            //TODO: should read prodyct category/templateID from one of the product attributes, but for now lets assume one.
            for (var i = 0; i < response[1].rows.length; i++) {
              if (response[1].rows[i].qualification.name === 'ProductType') {
                let productType = response[1].rows[i].values[3];
                if (!productType) {
                  tempInvalidProd.push(response[0]);
                }
                //TODO" change this to proper key
                templateAttributes.push(
                  template[`template${productType}`]?.properties
                );

                tempArray.push({
                  productID: response[0],
                  properties: template[`template${productType}`]?.properties,
                });

                setProductType(response[1].rows[i].values[3]);
                templateIds[response[0]] = response[1].rows[i].values[3];
              }
            }
            setInvalidProducts(tempInvalidProd);
            setTemplateBasedAttributes(tempArray);
            const result = {};
            for (const obj of templateAttributes) {
              for (const key in obj) {
                if (key != 'properties') {
                  const property = obj[key].properties;
                  const id = obj[key].id;
                  if (result.hasOwnProperty(key)) {
                    result[key] = {
                      ...result[key],
                      properties: {
                        ...result[key].properties,
                        ...property,
                      },
                    };
                  } else {
                    result[key] = {
                      properties: { ...property },
                    };
                  }
                }
              }
            }
            setAllAtributes(result);
            for (var i = 0; i < response[1].rows.length; i++) {
              if (
                response[1].rows[i].values[0] == 'en-US' ||
                isEmpty(response[1].rows[i].values[0])
              ) {
                allProdAttrs[response[0]].push({
                  object: response[1].rows[i].object,
                  qualification: response[1].rows[i].qualification,
                  locale: response[1].rows[i].values[0],
                  label: response[1].rows[i].qualification.name,
                  value: response[1].rows[i].values[2],
                  extendedValue: response[1].rows[i].values[3],
                  decimalValue: response[1].rows[i].values[4],
                  isActive: response[1].rows[i].values[5],
                  template: templateIds,
                });
              }
            }
          } else {
            toast.error('Unable to load product details', {
              position: 'top-right',
              minWidth: '500px',
              color: '#d1f0fd',
            });
          }
        });
        setLoader(false);
        setAttributeValues(allProdAttrs);
      });
    }
  }, [checkList, mediaAssetsLoaded]);

  //build Row Data
  useEffect(() => {
    let pinnedData = [];
    if (
      !isEmpty(productListData.current) &&
      !isEmpty(checkList) &&
      !isEmpty(attributeValues) &&
      !isEmpty(template) &&
      isObject(template[templateType])
    ) {
      let tempRowData = [];
      let approver = {},
        CPCapprover = {};

      forOwn(allAttributes, function (templateValue, templateKey, templateObj) {
        let tempRootChar = {};
        forEach(checkList, (productID) => {
          tempRootChar[productID] = null;
        });
        tempRootChar[size(checkList) + ' Products'] = templateKey;
        tempRootChar.attributeID = 'root';
        tempRowData.push(tempRootChar);
        forOwn(
          templateValue.properties,
          function (templateAttributes, templateAttributeName) {
            templateAttributes.root = templateKey;
            let tempRowChar = {};
            tempRowChar[size(checkList) + ' Products'] =
              templateAttributes.title;
            tempRowChar.attributeID = templateAttributeName;
            tempRowChar.templateAttributes = templateAttributes;

            const result = {};
            for (const obj of templateBasedAttributes) {
              const { productID, properties } = obj;
              for (const section in properties) {
                if (
                  properties[section].properties &&
                  properties[section].properties[templateAttributeName]
                ) {
                  result[productID] = section;
                  break;
                }
              }
            }
            forEach(checkList, (tempProdID, key) => {
              let attributeObj = attributeValues[tempProdID].filter(
                (value) => value.label === templateAttributeName
              )[0];
              if (attributeObj) {
                if (result[tempProdID] === templateAttributes?.root) {
                  tempRowChar[tempProdID] =
                    attributeObj.label === 'HidePrice'
                      ? attributeObj.value == 0 || attributeObj.value === 'No'
                        ? 'No'
                        : 'Yes'
                      : attributeObj.value;
                  tempRowChar[attributeObj.value] = attributeObj.extendedValue;
                  tempRowChar.extendedValue = attributeObj.extendedValue;
                } else {
                  tempRowChar[tempProdID] = '';
                  tempRowChar[attributeObj.value] = attributeObj.extendedValue;
                  tempRowChar.extendedValue = attributeObj.extendedValue;
                }
                if (result[tempProdID] === templateAttributes?.root) {
                  if (attributeObj.label == 'Cache') {
                    if (attributeObj.value.includes('undefined')) {
                      let val = attributeObj.value
                        .replace('undefined', '')
                        .trim();
                      tempRowChar[tempProdID] = val;
                    }
                  }
                  tempRowChar[attributeObj.value] = attributeObj.extendedValue;
                  tempRowChar.extendedValue = attributeObj.extendedValue;
                } else {
                  tempRowChar[tempProdID] = '';
                  tempRowChar[attributeObj.value] = attributeObj.extendedValue;
                  tempRowChar.extendedValue = attributeObj.extendedValue;
                }
              } else {
                tempRowChar[tempProdID] = null;
              }

              let approverObj = find(attributeValues[tempProdID], {
                label: 'LaunchApproverProductOwner',
              });
              if (approverObj) {
                approver[size(checkList) + ' Products'] = 'PME Approver';
                approver.attributeID = 'LaunchApproverProductOwner';
                approver[tempProdID] = approverObj.value;
                approver.extendedValue = approverObj.extendedValue;
                approver.template = approverObj.template;
              } else {
                approver[tempProdID] = null;
              }

              let CPCObj = find(attributeValues[tempProdID], {
                label: 'LaunchApproverCPCTeam',
              });
              if (CPCObj) {
                CPCapprover[size(checkList) + ' Products'] = 'CPC Approver';
                CPCapprover.attributeID = 'LaunchApproverCPCTeam';
                CPCapprover[tempProdID] = CPCObj.value;
                CPCapprover.extendedValue = CPCObj.extendedValue;
                CPCapprover.template = CPCObj.template;
              } else {
                CPCapprover[tempProdID] = null;
              }
            });
            tempRowData.push(tempRowChar);
          }
        );
      });
      tempRowData.push(CPCapprover, approver);
      const pinnedToSortedInOrder = [
        'ProductGroup',
        'LaunchApproverProductOwner',
        'LaunchApproverCPCTeam',
        'CodeNameText',
        'StatusCodeText',
        'LaunchDate',
        'BornOnDate',
      ];
      const itemsToMove = tempRowData.filter((obj) =>
        attributesToPinned.includes(obj.attributeID)
      );

      if (itemsToMove.length > 0) {
        pinnedRowData.push(...itemsToMove);
      }

      pinnedRowData.sort((a, b) => {
        const indexA = pinnedToSortedInOrder.indexOf(a.attributeID);
        const indexB = pinnedToSortedInOrder.indexOf(b.attributeID);
        return indexA - indexB;
      });
      setLoader(false);
      setLoadingRowData(false);
      setTemplateRowData(tempRowData);
      let pinnedData = mergeObjectwithSameId(pinnedRowData);
      setpinnedTopRowData(pinnedData);
      if (templateRowData.length === 0) {
        initialData = cloneDeep(tempRowData);
      } else {
        refreshGrid();
      }
    }
  }, [attributeValues, template, templateType, checkList]);

  useEffect(() => {
    const items = searchParams.get('items');
    if (items) {
      if (!loadingColumnData && !loadingRowData) {
        const arrList = [...new Set(items.split(','))];
        for (let i = 0; i < arrList.length; i++) {
          if (!checkList.includes(arrList[i])) {
            toast.error(
              arrList[i] +
                ' - ' +
                'Unable to load product, Product Type is missing.',
              {
                position: 'top-right',
                minWidth: '500px',
                color: '#d1f0fd',
                duration: 6000,
              }
            );
          }
        }
      }
    }
  }, [loadingColumnData, loadingRowData]);

  useEffect(() => {
    if (!loadingColumnData) {
      if (invalidProducts.length > 0) {
        let tempArray = [];
        for (let i = 0; i < checkList.length; i++) {
          if (!invalidProducts?.includes(checkList[i])) {
            tempArray.push(checkList[i]);
          }
        }
        setCheckList(tempArray);
      }
    }
  }, [loadingColumnData, invalidProducts]);

  const refreshGrid = () => {
    if (gridRef.current) {
      gridRef?.current.api.refreshCells();
    }
  };

  const mergeObjectwithSameId = (arr) => {
    var mergedArray = [];
    var mergedObject = {};
    arr.forEach(function (obj) {
      var id = obj['attributeID'];
      if (mergedObject[id]) {
        for (var key in obj) {
          if (obj[key] !== '' && key !== 'attributeID') {
            mergedObject[id][key] = obj[key];
          }
        }
      } else {
        mergedObject[id] = obj;
        mergedArray.push(obj);
      }
    });
    return mergedArray;
  };

  const _addProductCountColumn = (prodCount) => {
    return {
      headerName: prodCount + ' Products',
      field: prodCount + ' Products',
      resizable: false,
      celleditable: false,
      cellStyle: (params) => {
        if (params.data.attributeID === 'root') {
          //mark police cells as red
          return {
            fontWeight: 'bold',
            textAlign: 'center',
            color: '#1671b9',
            whiteSpace: 'normal',
            fontSize: 'large',
          };
        } else {
          return {
            fontWeight: 'bold',
            textAlign: 'center',
            backgroundColor: '#f8f8f8',
            whiteSpace: 'normal',
            border: '1px solid #E3E8F0',
            autoHeight: 'true',
          };
        }
      },
      pinned: 'left',
      lockPosition: true,
      wrapText: true,
      cellRenderer: RowFormatter,
      headerComponent: ProductCountRenderer,
    };
  };

  const _getProductColumn = (productID, productData) => {
    return {
      headerName: productData?.rows[0]?.values[0],
      field: productID,
      cellStyle: (params) => {
        let oldRow;
        initialData?.some((row) => {
          if (params.data.attributeID === row.attributeID) {
            oldRow = cloneDeep(row);
            return true;
          }
          return false;
        });
        if (
          currEvent &&
          params.data.attributeID === currEvent.data.attributeID &&
          params.value?.trim() !== oldRow[productID].trim() &&
          params.value?.trim() === params.data[currEvent.colDef.field].trim()
        ) {
          return {
            cellClass: 'sticky-cell',
            whiteSpace: 'normal',
            textAlign: 'center',
            textOverflow: 'hidden',
            padding: 0,
            display: 'block',
            backgroundColor: '#fff4b3',
          };
        }

        return {
          cellClass: 'sticky-cell',
          whiteSpace: 'normal',
          textAlign: 'center',
          textOverflow: 'hidden',
          padding: 0,
          display: 'block',
        };
      },
      editable: false, //selectively disable editing for rootchar headers
      headerComponent: ProductNameRenderer,
      headerComponentParams: {
        columnData,
        setColumnData,
        newRowDataA,
        setNewRowDataA,
        productListData,
        checkList
      },
      cellRenderer: DataFormatter,
      cellRendererParams: {
        productListData,
        CPCApproval,
      },
      valueFormatter: ValueRenderer,
    };
  };

  function _checkEditFunction(params) {
    if (params.data.attributeID == 'root') {
      return false;
    } else {
      return true;
    }
  }

  //may be moved to a generic utilites file
  function _sortByKeys(array, parentKey, key) {
    return array.sort(function (a, b) {
      var x = a[parentKey];
      var y = b[parentKey];
      var c = a[key];
      var d = b[key];
      return (x < y ? -1 : x > y ? 1 : 0) || (c < d ? -1 : c > d ? 1 : 0);
    });
  }

  const onGridReadyTasks = useCallback((e) => {
    if (gridRef.current.columnApi.getAllColumns()[0] != undefined) {
      gridRef.current.columnApi.autoSizeColumns([
        gridRef.current.columnApi.getAllColumns()[0].getId(),
      ]);
    }
    Modal.setAppElement('#myGrid');
  });
  const isRowHidden = (params) => {
    return (
      params.node.rowPinned !== 'top' &&
      attributesToPinned.includes(params.node.data.attributeID)
    );
  };

  const getRowStyle = (params) => {
    if (isRowHidden(params)) {
      return { display: 'none' };
    }
  };

  const getRowHeight = useCallback((params) => {
    if (isRowHidden(params)) {
      return 0;
    } else if (
      params.data.attributeID == 'ProductGroup' ||
      params.data.attributeID == 'CodeNameText'
    ) {
      return 50;
    } else {
      return 30;
    }
  }, []);

  const createData = (count, prefix) => {
    var result = [];
    for (var i = 0; i < count; i++) {
      result.push({});
    }
    return result;
  };
  function getBornOnDate(launchDate) {
    var newDate;
    var date = new Date(launchDate);
    var init = new Date('1900-01-01');
    return (newDate = Math.round((date - init) / (1000 * 60 * 60 * 24)));
  }
  function getExtendedVals(l, templateData, productID, reqBody) {
    let arr = Object.entries(l)[0];
    let attrObj = find(attributeValues[productID], { label: arr[0] });
    let newVal = arr[1];
    forOwn(templateData.properties, (value, key) => {
      forOwn(value.properties, (secVal, secKey) => {
        if (arr[0] === secKey) {
          let conversion = secVal.rawValue;
          let code = secVal['unit-code'];
          let volatile = secVal['isVolatitle'];
          let object = secVal['unitObject'];
          let rowObj = {};
          let otherVals = [];
          let extendedValue = null;
          let decimalValue = null;
          rowObj.object = attrObj.object;
          rowObj.qualification = attrObj.qualification;
          if (isEmpty(rowObj.qualification.identifier)) {
            delete rowObj.qualification.identifier;
          }
          otherVals =
            conversion != 'undefined'
              ? AttributeValueConversion(
                  conversion,
                  newVal,
                  code,
                  volatile,
                  object
                )
              : [newVal, ''];
          if (isNaN(newVal) && conversion !== 'undefined') {
            newVal = newVal;
            extendedValue = otherVals[0];
            decimalValue = otherVals[1];
          } else {
            extendedValue = newVal;
            decimalValue = newVal;
          }
          rowObj.values = [newVal, extendedValue, decimalValue];
          reqBody.push(rowObj);
        }
      });
    });
  }
  function getOtherVals(l, productID, reqBody) {
    let attrObj = find(attributeValues[productID], { label: l });
    let newVal = '';
    let rowObj = {};
    rowObj.object = attrObj.object;
    rowObj.qualification = attrObj.qualification;
    rowObj.values = [newVal, newVal, newVal];
    reqBody.push(rowObj);
  }
  const saveToPIM = async (
    attrName,
    additionalValue,
    productIDs,
    extendedValue,
    decimalValue
  ) => {
    let success = true;
    let reqBody = [];
    let getObject = find(attributeValues[currEvent.colDef.field], {
      label: attrName,
    });
    forEach(productIDs, async (productID) => {
      let attrObj = find(attributeValues[productID], { label: attrName });
      if (attrObj == undefined) {
        success = false;
        toast.error(
          'Error: Attribute[' +
            attrName +
            '] does not exist in PIM for Product[' +
            productID +
            ']',
          {
            position: 'top-right',
            minWidth: '500px',
            color: '#d1f0fd',
          }
        );
        return success;
      }
      let rowObj = {};
      let productAttributes = attributeValues[productID];
      let launchDate, newDate, bornDate;
      gridRef.current.api.forEachNodeAfterFilter(function (rowNode, index) {
        if (rowNode.data.attributeID === 'LaunchDate') {
          let launch = rowNode.data[productID].trim();
          if (launch != '' || launch != undefined) newLaunchDate = launch;
        }
        if (rowNode.data.attributeID === 'BornOnDate') {
          if (rowNode.data[productID] != '')
            newBornOnDate = rowNode.data[productID].trim();
        }
      });
      if (attrName === 'BornOnDate') {
        setBornOnDate(additionalValue.trim())
        bornDate = additionalValue.trim();
      }
      if (attrName === 'LaunchDate') {
        rowObj.object = attrObj.object;
        rowObj.qualification = attrObj.qualification;
        let rawDate = new Date(additionalValue)
          .toLocaleString()
          .replace(/,/g, '');
        let extVal = extendedValue == null ? rawDate : extendedValue;
        rowObj.values = [additionalValue, extVal, decimalValue];
        launchDate = extVal;
        productAttributes.filter(function (rowObj) {
          if (rowObj.label === 'BornOnDate') {
            rowObj.object = rowObj.object;
            rowObj.qualification = rowObj.qualification;
            newDate = launchDate != '' ? getBornOnDate(launchDate) : '';
            rowObj.values = [
              newBornOnDate != undefined ? newBornOnDate : bornOnDate,
              newDate,
              newDate,
            ];
            reqBody.push(rowObj);
          }
          bDate.current = newDate;
        });
      } else if (attrName === 'BornOnDate') {
        rowObj.object = attrObj.object;
        rowObj.qualification = attrObj.qualification;
        let vals = additionalValue;
        productAttributes.filter(function (rowObj) {
          if (rowObj.label === 'LaunchDate' && newLaunchDate == '') {
            const re = "^Q([0-9])'([0-5][0-9])(s*)$";
            if (vals.match(re)) {
              let b = vals.split("'");
              let quarter = parseInt(b[0].match(/[0-9]+/));
              let year = parseInt(b[1]);
              var month = (quarter - 1) * 3 + 1;
              year = (year < 90 ? 2000 : 1900) + year;
              let date = new Date(year, month - 1, 1).toLocaleDateString(
                'en-US',
                {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                }
              );
              let rawDate = new Date(date).toLocaleString().replace(/,/g, '');
              rowObj.values = [date, rawDate, ''];
              newLaunchDate = date;
              if (date == rowObj.value || rowObj.value == '' || rowObj.values.length>0) {
                reqBody.push(rowObj);
                newDate = getBornOnDate(rawDate);
                bDate.current = newDate;
              } else {
                let rawDate = new Date(rowObj.value)
                  .toLocaleString()
                  .replace(/,/g, '');
                newDate = getBornOnDate(rawDate);
                bDate.current = newDate;
              }
            }
          } else if (
            rowObj.label === 'LaunchDate' &&
            rowObj.value !== '' &&
            !rowObj.values
          ) {
            let date = newLaunchDate.trim();
            launchDate = date != undefined && date !== '' ? date : rowObj.value;
            newDate = getBornOnDate(launchDate);
            bDate.current = newDate;
          }
        });
        bDate.current == undefined
          ? (rowObj.values = [additionalValue, additionalValue, ''])
          : (rowObj.values = [additionalValue, bDate.current, bDate.current]);
      } else {
        rowObj.object = attrObj.object;
        rowObj.qualification = attrObj.qualification;
        //TODO: calculate Rawvl dec and rawval extended here value here.
        rowObj.values = [additionalValue, extendedValue, decimalValue];
      }
      if (
        attrName === 'OperatingTemperatureMin' ||
        attrName === 'OperatingTemperatureMax'
      ) {
        let obj = {};
        let rangeObj = find(attributeValues[productID], {
          label: 'OperatingTemperature',
        });
        let minobj = find(attributeValues[productID], {
          label: 'OperatingTemperatureMin',
        });
        let maxobj = find(attributeValues[productID], {
          label: 'OperatingTemperatureMax',
        });
        let valuerange;
        if (additionalValue === '') {
          valuerange = '';
        } else {
          valuerange =
            attrName === 'OperatingTemperatureMin'
              ? additionalValue + ' to ' + maxobj.value
              : minobj.value + ' to ' + additionalValue;
        }
        obj.object = rangeObj.object;
        obj.qualification = rangeObj.qualification;

        obj.values = [valuerange, valuerange, ''];
        reqBody.push(obj);
      }

      let templateData = template['template' + attrObj?.template[productID]];
      if (attrName === 'ProcessorIncluded') {
        if (processorID) {
          if (list.length > 0)
            list?.forEach((l) => {
              getExtendedVals(l, templateData, productID, reqBody);
            });
          else {
            extract?.forEach((l) => {
              getOtherVals(l, productID, reqBody);
            });
          }
        } else {
          extract?.forEach((l) => {
            getOtherVals(l, productID, reqBody);
          });
        }
      }
      if (attrName === 'WirelessIncluded') {
        if (wirelessID) {
          if (listWireless.length > 0)
            listWireless?.forEach((l) => {
              getExtendedVals(l, templateData, productID, reqBody);
            });
          else {
            extractWireless?.forEach((l) => {
              getOtherVals(l, productID, reqBody);
            });
          }
        } else {
          extractWireless?.forEach((l) => {
            getOtherVals(l, productID, reqBody);
          });
        }
      }
      if (getObject.value === additionalValue && bulkEditEnabled) {
        rowObj.object = attrObj.object;
        rowObj.qualification = attrObj.qualification;
        if (
          getObject.label == 'BornOnDate'
        ) {
          rowObj.values = [
            additionalValue,
            newDate != '' ? newDate : getObject.extendedValue,
            newDate != '' ? newDate : getObject.decimalValue,
          ];
        }else if(
          getObject.label == 'LaunchDate'
        ) {
          rowObj.values = [
            additionalValue,
            getObject.extendedValue,
            '',
          ];
        } else {
          rowObj.values = [
            additionalValue,
            getObject.extendedValue,
            getObject.decimalValue,
          ];
        }
      }
      if (!isEmpty(rowObj)) {
        rowObj.qualification.identifier =
          rowObj.qualification.identifier !== ''
            ? rowObj.qualification.identifier
            : 'en-US';
        rowObj.qualification.language =
          rowObj.qualification.language !== ''
            ? rowObj.qualification.language
            : 'English';

        reqBody.push(rowObj);
      }
      if(rowObj.qualification.name === "VProTechnologyOptions"){
        let vProTech={}
        let VProTechObj = productAttributes.find((obj)=> obj.qualification.name === 'VProTechnology')
        if(VProTechObj){
          VProTechObj.qualification.identifier =
          VProTechObj.qualification.identifier !== ''
            ? VProTechObj.qualification.identifier
            : 'en-US';
            VProTechObj.qualification.language =
            VProTechObj.qualification.language !== ''
            ? VProTechObj.qualification.language
            : 'English';
        }
        vProTech.object= VProTechObj.object
        vProTech.qualification= VProTechObj.qualification
        if(!isEmpty(rowObj.values[1])){
          vProTech.values = ['Yes','True','']
        }else{
          vProTech.values = ['No','False','']
        }
        reqBody.push(vProTech)
      }
      let ark = {};
      let ARKobj = attributeValues[productID].find(
        (obj) => obj.qualification.name === 'Ark_Page_refresh'
      );
      if(ARKobj){
        ARKobj.qualification.identifier =
        ARKobj.qualification.identifier !== ''
          ? ARKobj.qualification.identifier
          : 'en-US';
          ARKobj.qualification.language =
          ARKobj.qualification.language !== ''
          ? ARKobj.qualification.language
          : 'English';
      }
      ark.object = ARKobj.object;
      ark.qualification = ARKobj.qualification;
      ark.values = getArkRefreshDate();
      reqBody.push(ark);
    });

    productAttributeTasks
      .setProductAttributes(username, password, reqBody)
      .then((response) => {
        if (response.counters.errors > 0) {
          success = false;
          toast.error('Error saving data', {
            position: 'top-right',
            minWidth: '500px',
            color: '#d1f0fd',
          });
          forOwn(response.entries, (value, key) => {
            toast.error(value.message, {
              position: 'top-right',
              minWidth: '500px',
              color: '#d1f0fd',
            });
          });
        } else if (response.counters.updatedObjects > 0) {
          toast.success(
            'Product attributes Updated for ' +
              productIDs.length +
              ' products.',
            {
              position: 'top-right',
              minWidth: '500px',
              color: '#d1f0fd',
            }
          );
        } else {
        }
      });

    return success;
  };
  const persistEditstoPIM = useCallback((e) => {
    let productId = e.colDef.field;
    let charID = e.data.charID;
    let charParentRecordKey = e.data.attributeID;
    let newValue = e.newValue;
    let rows = [];

    let prodIDsToBeUpdated = [productId];

    if (bulkEditEnabled) {
      for (const key in e.data) {
        if (key != productId && key.match('^[0-9]+$') && key.length > 2) {
          prodIDsToBeUpdated.push(key);
        }
      }
    }

    for (let i = 0; i < prodIDsToBeUpdated.length; i++) {
      rows.push({
        object: {
          id: "'" + prodIDsToBeUpdated[i] + "'@'MASTER'",
        },
        qualification: {
          parentRecordKey: charParentRecordKey,
          language: 'Language independent',
          characteristic: {
            id: charID,
          },
        },
        values: [[newValue]],
      });
    }

    var config = {
      method: 'post',
      url: pimRESTGw + '/rest/V1.0/list/Article/ArticleCharacteristicValue',
      headers: {
        Authorization: 'Basic ' + btoa(username + ':' + password),
        'Content-Type': 'application/json',
      },
      data: JSON.stringify({
        columns: [
          {
            identifier: 'ArticleCharacteristicValueLang.Value',
          },
        ],
        rows: rows,
      }),
    };

    Promise.all([axios(config)]).then((responses) => {
      for (let i = 0; i < responses.length; i++) {
        if (responses[i].data.objects[0].status.length != 1) {
          //API error reset value back to old value
          if (bulkEditEnabled) {
            toast.error(
              'Bulk Edit Failed: ' + responses[i].data.entries[0].message,
              {
                position: 'top-right',
                minWidth: '500px',
              }
            );
          } else {
            toast.error(
              'Edit Failed: ' + responses[i].data.entries[0].message,
              {
                position: 'top-right',
                minWidth: '500px',
              }
            );
          }

          e.node.data[productId] = e.oldValue;
          e.api.refreshCells({ rowNodes: [e.node], columns: [productId] });
        } else {
          if (bulkEditEnabled) {
            toast.success(
              'Bulk Edit Successful. Updated ' +
                responses[i].data.counters.updatedObjects +
                ' Products.',
              {
                position: 'top-right',
                minWidth: '500px',
              }
            );
          } else {
            toast.success(
              'Edit Successful. Updated ' +
                responses[i].data.counters.updatedObjects +
                ' Products.',
              {
                position: 'top-right',
                minWidth: '500px',
              }
            );
          }
        }
      }
    });

    setreloadData(reloadData + 1);
  });

  const autoSizeAll = useCallback((skipHeader) => {
    const allColumnIds = [];
    gridRef.current.columnApi.getAllColumns().forEach((column) => {
      allColumnIds.push(column.getId());
    });
    gridRef.current.columnApi.autoSizeColumns(allColumnIds, skipHeader);
  }, []);

  const convertHTMLToPlain = (html) => {
    var tempDivElement = document.createElement('div');
    tempDivElement.innerHTML = html;
    return tempDivElement.textContent || tempDivElement.innerText || '';
  };

  const rowClassRules = {
    'diff-row': function (params) {
      if (highlightDiffCols) {
        const keysToCheck = Object.keys(params.data).filter(
          (key) => (key.match('^[0-9]+$') && key.length > 2)
        );
        if (keysToCheck.length > 0) {
          const prevVal = params.data[keysToCheck[0]];
          return keysToCheck.some((key) => params.data[key] !== prevVal);
        }
      }
      return false;
    },
     // Root char header row styling
    'root-char-row': function (params) {
      return params.data.attributeID === 'root';
    },
  };
  const CPCApproval = async (productId, WWID, event) => {
    if (!isNull(currentClickEvent)) {
      let Event = event ? event : currentClickEvent;
      let userinfo = JSON.parse(localStorage.getItem('userInfo'));
      if (userinfo !== null) {
        var wwid = userinfo.jobTitle;
      }
      let approver = WWID == '' ? '' : WWID ? WWID : wwid;
      let reqRows = [];

      let missingAttributesProducts = [];
      let correctAttributesProducts = [];
      let LaunchDate, BornOnDate;
      if (bulkEditEnabled) {
        listForBulk.forEach((productId) => {
          LaunchDate = find(attributeValues[productId], {
            locale: 'en-US',
            label: 'LaunchDate',
          });
          BornOnDate = find(attributeValues[productId], {
            label: 'BornOnDate',
          });
          if (
            isUndefined(LaunchDate) ||
            isNull(LaunchDate?.value) ||
            isEmpty(LaunchDate?.value) ||
            isUndefined(BornOnDate) ||
            isNull(BornOnDate?.value) ||
            isEmpty(BornOnDate?.value)
          ) {
            missingAttributesProducts.push(productId);
          } else {
            correctAttributesProducts.push(productId);
          }
        });
      } else {
        LaunchDate = find(attributeValues[productId], {
          locale: 'en-US',
          label: 'LaunchDate',
        });
        BornOnDate = find(attributeValues[productId], {
          label: 'BornOnDate',
        });
        if (
          isUndefined(LaunchDate) ||
          isNull(LaunchDate?.value) ||
          isEmpty(LaunchDate?.value) ||
          isUndefined(BornOnDate) ||
          isNull(BornOnDate?.value) ||
          isEmpty(BornOnDate?.value)
        ) {
          missingAttributesProducts.push(productId);
        } else {
          correctAttributesProducts.push(productId);
        }
      }
      if (correctAttributesProducts.length > 0) {
        for (let i = 0; i < correctAttributesProducts.length; i++) {
          let rowObj = {};
          let attributeObj = attributeValues[
            correctAttributesProducts[i]
          ].filter((value) => value.label === Event.data.attributeID)[0];
          rowObj.object = attributeObj.object;
          rowObj.qualification = attributeObj.qualification;
          rowObj.values = [approver, approver, approver];
          reqRows.push(rowObj);
          let ark = {};
          let ARKobj = attributeValues[correctAttributesProducts[i]].find(
            (obj) => obj.qualification.name === 'Ark_Page_refresh'
          );
          ark.object = ARKobj.object;
          ark.qualification = ARKobj.qualification;
          ark.values = getArkRefreshDate();
          reqRows.push(ark);
          if (!isEmpty(rowObj)) {
            rowObj.qualification.identifier =
              rowObj.qualification.identifier !== ''
                ? rowObj.qualification.identifier
                : 'en-US';
            rowObj.qualification.language =
              rowObj.qualification.language !== ''
                ? rowObj.qualification.language
                : 'English';
    
              reqRows.push(rowObj);
          }
        }
        let Save = productAttributeTasks
          .setProductAttributes(username, password, reqRows)
          .then((response) => {
            let success = true;
            if (response.counters.errors > 0) {
              success = false;
              toast.error('Error saving data', {
                position: 'top-right',
                minWidth: '500px',
                color: '#d1f0fd',
              });
              forOwn(response.entries, (value, key) => {
                toast.error(value.message, {
                  position: 'top-right',
                  minWidth: '500px',
                  color: '#d1f0fd',
                });
              });
            } else if (response.counters.updatedObjects > 0) {
              toast.success(
                'Product attributes Updated for ' +
                  correctAttributesProducts.length +
                  ' products.',
                {
                  position: 'top-right',
                  minWidth: '500px',
                  color: '#d1f0fd',
                }
              );
            } else {
            }
            return success;
          });

        if (Save) {
          const itemsToUpdate = [];
          gridRef.current.api.forEachNodeAfterFilterAndSort(function (
            rowNode,
            index
          ) {
            // only do first 2
            if (rowNode.data.attributeID == Event.data.attributeID) {
              const data = rowNode.data;

              if (bulkEditEnabled) {
                forEach(correctAttributesProducts, (productId) => {
                  data[productId] = approver;
                });
              } else {
                data[Event.colDef.field] = approver;
              }
              itemsToUpdate.push(data);
            }
          });
          const res = gridRef.current.api.applyTransaction({
            update: itemsToUpdate,
          });
        }
      }
      if (missingAttributesProducts.length > 0) {
        let missingAttributesProductsList;
        for (let i = 0; i < missingAttributesProducts.length; i++) {
          missingAttributesProductsList = missingAttributesProducts.join(',');
        }
        toast.error(
          'Please set Publication Date, Launch Date for- ' +
            missingAttributesProductsList +
            '.',
          {
            position: 'top-right',
            minWidth: '500px',
          }
        );
        return;
      }
    }
  };
  const exportToExcel = () => {
    const columnDefs = gridRef.current.api.getColumnDefs();
    let columnHeaders = [];

    for (let i = 0; i < checkList.length + 1; i++) {
      columnHeaders.push(columnDefs[i].headerName);
    }
    const rowData = [];

    gridRef.current.api.forEachNode((node) => {
      rowData.push(node.data);
    });
    const processedData = [];
    rowData.forEach((dataRow) => {
      if (dataRow.attributeID === 'root') {
        processedData.push({}, dataRow, {});
      } else {
        processedData.push(dataRow);
      }
    });
    const pinnedRows = processedData.filter((row) => {
      return attributesToPinned.includes(row.attributeID);
    });
    let tableData = processedData.filter(
      (obj) => !attributesToPinned.includes(obj.attributeID)
    );
    let productsCount = `${checkList.length} Products`;
    const finalData = [...pinnedRows, ...tableData];
    let keys = [{ key: productsCount, value: productsCount }];
    checkList.forEach((val) => {
      columnDefs.filter((name) => {
        if (name.field == val) {
          let idval = name.field;
          let valuename = name.headerName;
          keys.push({ key: idval, value: valuename });
        }
      });
    });
    const filterFinalData = finalData.map((obj) => {
      const filteredObject = {};
      keys.forEach((obj2) => {
        filteredObject[obj2['value']] = obj[obj2['key']];
      });
      return filteredObject;
    });
    const excelData = [
      columnHeaders.reduce((obj, header) => ({ ...obj, [header]: '' }), {}),
      ...filterFinalData,
    ];
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([columnHeaders]);
    XLSX.utils.sheet_add_json(
      worksheet,
      excelData.map((row) => {
        const newRow = {};
        for (const key in row) {
          newRow[key] = removeHtmlTags(row[key]);
        }
        return newRow;
      }),
      {
        header: columnHeaders,
      }
    );

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    XLSX.writeFile(workbook, 'Bulk_export.xlsx');
  };
  function removeHtmlTags(input) {
    if (input == null || input === '') {
      return '';
    }
    return input.replace(/<[^>]*>/g, '');
  }

  return (
    <>
      {!loader ? (
        checkList.length > 0 ? (
          <div style={{ height: '90%' }}>
            <div className="banner-unapproved">
              SPARK: Restricted Intel Internal Audiences only
            </div>
            <div className="banner-bulkEdit">
              {bulkEditEnabled && (
                <span className="">This page is in Bulk Edit mode</span>
              )}
            </div>

            <div className="search-container">
              <Compare checkList={checkList} setCheckList={setCheckList} />
              <CommonSearch />
            </div>

            <div>
              <Toaster
                toastOptions={{
                  className: '',
                  style: {
                    backgroundColor: '#d1f0fd',
                    position: 'top-right',
                    minWidth: '400px',
                  },
                  success: {
                    style: {
                      background: '#73C322',
                      color: 'white',
                    },
                  },
                  error: {
                    style: {
                      background: '#D41111',
                      color: 'white',
                    },
                  },
                }}
              />
            </div>

            <Modal
              isOpen={modalIsOpen}
              onAfterOpen={afterOpenModal}
              style={modalCustomStyles}
              contentLabel="Example Modal"
            >
              {bulkEditEnabled && (
                <span className="editValues">
                  This is in Bulk Edit mode. Any changes will be applied to all
                  the products added in the compare page.
                </span>
              )}
              <div>
                <span style={{ fontWeight: 'bold' }}>
                  {!isNull(currentClickEvent)
                    ? removeChars(
                        currentClickEvent.data[checkList.length + ' Products']
                      )
                    : ''}
                </span>
                <br></br>
                <ModalEdit
                  onCloseModal={closeModal}
                  onSaveModal={saveModal}
                  currentEvent={currentClickEvent}
                  templateJSON={template[templateType]}
                  onValueChange={modalValueChanged}
                />
              </div>
            </Modal>

            <div
              className="col"
              style={{
                paddingBottom: '15px',
                paddingLeft: '15px',
                paddingRight: '15px',
                paddingTop: '15px',
              }}
            >
              {roleRank <= 3 ? (
                <BootstrapSwitchButton
                  checked={bulkEditEnabled}
                  onlabel="Enable Bulk Edit"
                  offlabel="Enable Bulk Edit"
                  width={160}
                  onstyle="primary"
                  offstyle="info"
                  onChange={(checked) => {
                    setbulkEditEnabled(checked);
                    if (checked) {
                      toast.success('Enabled bulk edit.', {
                        position: 'top-right',
                        minWidth: '500px',
                      });
                    }
                  }}
                  style="bulkEditButton"
                />
              ) : null}
              <BootstrapSwitchButton
                checked={highlightDiffCols}
                onlabel="Highlight Differences"
                offlabel="Highlight Differences"
                width={200}
                onstyle="primary"
                offstyle="info"
                onChange={(checked) => {
                  gridRef.current.api.redrawRows();
                  if (checked) {
                    toast.success(
                      'Highlighting rows with different valued attributes.',
                      {
                        position: 'top-right',
                        minWidth: '500px',
                      }
                    );
                  }

                  sethighlightDiffCols(checked);
                }}
              />

              {isSystemAdmin && (
                <Button
                  className="export-specifications"
                  onClick={onClickpublish}
                >
                  Publish
                </Button>
              )}
              <span style={{ float: 'right' }}>
                <Button
                  className="export-specifications"
                  onClick={exportToExcel}
                >
                  Export Results
                </Button>
              </span>
              {bulkEditEnabled && (
                <span className="enable-bulkEdit">
                  This page is in Bulk Edit mode
                </span>
              )}
            </div>

            <div
              id="myGrid"
              className="col ag-theme-alpine"
              style={{
                minHeight: '700px',
                paddingLeft: '15px',
                paddingRight: '15px',
                paddingBottom: '3px',
              }}
            >
              <AgGridReact
                alwaysShowVerticalScroll={true}
                ref={gridRef} // Ref for accessing Grid's API
                rowData={templateRowData} // Row Data for Rows
                columnDefs={columnData} // Column Defs for Columns
                colResizeDefault={columnData.colResizeDefault}
                getRowHeight={getRowHeight}
                suppressDragLeaveHidesColumns={true}
                suppressFieldDotNotation={true}
                headerHeight={160}
                headerwidth={500}
                defaultColDef={defaultColDef} // Default Column Properties
                animateRows={true} // Optional - set to 'true' to have rows animate when sorted
                debounceVerticalScrollbar={true}
                enableCellTextSelection="true"
                onCellClicked={cellClickedListener} // Optional - registering for Grid Event
                onGridReady={onGridReadyTasks}
                rowClassRules={rowClassRules}
                overlayNoRowsTemplate={'Loading the Product data'}
                suppressColumnVirtualisation={true}
                pinnedTopRowData={PinnedTopRowData}
                getRowStyle={getRowStyle}
                enableColResize={true}
                allowResizing={true}
                suppressAutoSize={true}
              />
            </div>
          </div>
        ) : (
          <p className="no-items">
            No items currently selected to compare.{' '}
            <Link to="/">Browse Products</Link>.
          </p>
        )
      ) : (
        <Loader loaderText="Loading..." />
      )}

      {showPublishModal && (
        <PublishModal
          products={checkList}
          calLoader={calLoader}
          fieldsData={fieldsData}
          MMData={MMData}
          show={showPublishModal}
          setShow={setShowPublishModal}
        />
      )}
    </>
  );
};
export default BulkEditGrid;
