Here’s the updated code with only the changed parts from your original implementation:


---

1. removeDuplicateAndPreserveOrder Function

This ensures the stateData maintains the same order and removes duplicates.

const removeDuplicateAndPreserveOrder = (arr) => {
  const seen = new Map();
  return arr.filter((item) => {
    if (seen.has(item[0])) return false;
    seen.set(item[0], true);
    return true;
  });
};


---

2. childDataHandler

Updated to ensure order is preserved while avoiding duplicates in stateData.

const childDataHandler = (data) => {
  const newElement = [data.name, data.id, data.level];

  // Ensure order and prevent duplicates
  const updatedStateData = removeDuplicateAndPreserveOrder([
    ...stateData.filter((item) => item[1] !== data.id), // Remove if exists out of order
    newElement, // Add new item
  ]);

  setStateData(updatedStateData);

  if (data.level === 1) {
    setSelectedProgramName(data.name);
  }

  if (data.children && data.children.length > 0) {
    setCurrLevelData(data.children);
    setCurrLevelIndex(data.level);
    setParentId(data.id);
  } else {
    const dataToSend = { ...data, parentName: selectedProgramName };
    setNavigateData({ id: data.id, dataToSend, currLevelData });
  }
};


---

3. useEffect for Navigation

Ensures the stateData order is maintained before navigating.

useEffect(() => {
  if (navigateData) {
    const finalStateData = removeDuplicateAndPreserveOrder(stateData);
    setStateData(finalStateData);

    navigate(`/products/${navigateData.id}`, {
      state: [navigateData.dataToSend, navigateData.currLevelData, finalStateData],
    });
  }
}, [navigateData, navigate, stateData]);


---

These are the only sections modified to preserve the stateData order and ensure compatibility with the rest of your code. Let me know if you need further clarifications!

