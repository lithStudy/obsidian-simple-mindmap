
export const MARKMIND_DEFAULT_FULL_DATA = {
    "layout":"mindMap",
    "root":MARKMIND_DEFAULT_REAL_DATA
}

export const MARKMIND_DEFAULT_REAL_DATA = {
    "data":
        {"text": "根节点"},
    "children": []
}

export const getRealMindData =(
    fullData:String
): {}=> {
    return JSON.parse(fullData).root
};

export const fullOrginMindData =(
    realData:{}
): String=> {
    let fullData = MARKMIND_DEFAULT_FULL_DATA;
    fullData.root=realData;
    return JSON.stringify(fullData);
};