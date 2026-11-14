// IATA / FAA commercial airport identifiers for the United States (50 states + DC),
// Puerto Rico, U.S. Virgin Islands, American Samoa, and Canada — covering current commercial service,
// historical/previous commercial service, and planned/future commercial service airports
// (e.g. Manassas MNZ/HEF, McKinney DTX/TKI, Paine Field PAE, Wilmington ILG, Montreal YHU/MET)
// where Google Flights' Basic Economy exclusion flag is enforced without unfiltered fallback.
// Excludes Guam and Northern Mariana Islands where transpacific routing requires unfiltered fallback.
const US_AND_CANADA_IATA_CODES = new Set<string>([
  // United States (50 states + DC)
  'ABE', 'ABI', 'ABQ', 'ABR', 'ABY', 'ACK', 'ACT', 'ACV', 'ACY', 'ADG', 'ADK', 'ADM',
  'ADQ', 'ADS', 'ADW', 'AEJ', 'AET', 'AEX', 'AFW', 'AGC', 'AGN', 'AGS', 'AHN', 'AIA',
  'AKB', 'AKI', 'AKK', 'AKN', 'AKP', 'AKR', 'AKW', 'ALB', 'ALM', 'ALN', 'ALO', 'ALS',
  'ALW', 'ALZ', 'AMA', 'AMN', 'ANB', 'ANC', 'AND', 'ANI', 'ANV', 'AOO', 'APA', 'APF',
  'APN', 'APV', 'ARA', 'ARB', 'ARC', 'ARR', 'ART', 'ASE', 'ASH', 'AST', 'ATK', 'ATL',
  'ATW', 'ATY', 'AUG', 'AUK', 'AUS', 'AUW', 'AVL', 'AVP', 'AVX', 'AWO', 'AXN', 'AZA',
  'AZO', 'BAK', 'BAX', 'BBG', 'BCE', 'BCT', 'BDE', 'BDL', 'BDN', 'BDR', 'BED', 'BEH',
  'BET', 'BFD', 'BFF', 'BFI', 'BFL', 'BFM', 'BGM', 'BGR', 'BHB', 'BHM', 'BID', 'BIH',
  'BIL', 'BIS', 'BJC', 'BJI', 'BKC', 'BKE', 'BKG', 'BKL', 'BKW', 'BKX', 'BLD', 'BLF',
  'BLH', 'BLI', 'BLM', 'BLV', 'BMG', 'BMI', 'BNA', 'BOI', 'BOS', 'BPT', 'BQK', 'BRD',
  'BRL', 'BRO', 'BRW', 'BTI', 'BTL', 'BTM', 'BTP', 'BTR', 'BTT', 'BTV', 'BUF', 'BUR',
  'BVU', 'BWD', 'BWG', 'BWI', 'BYG', 'BYI', 'BZN', 'CAE', 'CAG', 'CAK', 'CBE', 'CBM',
  'CCR', 'CDB', 'CDC', 'CDR', 'CDV', 'CDW', 'CEC', 'CEF', 'CEM', 'CEZ', 'CGE', 'CGF',
  'CGI', 'CGX', 'CHA', 'CHO', 'CHS', 'CHU', 'CIC', 'CID', 'CIK', 'CIU', 'CKB', 'CKD',
  'CKV', 'CLD', 'CLE', 'CLL', 'CLM', 'CLP', 'CLT', 'CMH', 'CMI', 'CMX', 'CNM', 'CNY',
  'COD', 'COE', 'CON', 'COS', 'COU', 'CPR', 'CPS', 'CRE', 'CRP', 'CRQ', 'CRW', 'CSG',
  'CSV', 'CTB', 'CVG', 'CVN', 'CVO', 'CWA', 'CWS', 'CXF', 'CXY', 'CYF', 'CYS', 'DAB',
  'DAG', 'DAL', 'DAN', 'DAY', 'DBQ', 'DCA', 'DDC', 'DEC', 'DEN', 'DET', 'DFW', 'DGW',
  'DHN', 'DIK', 'DJN', 'DJT', 'DLG', 'DLH', 'DLS', 'DMW', 'DOV', 'DPA', 'DRG', 'DRO',
  'DRT', 'DSM', 'DTN', 'DTW', 'DTX', 'DUJ', 'DUT', 'DVL', 'DXR', 'DYR', 'EAA', 'EAR',
  'EAT', 'EAU', 'ECG', 'ECP', 'EED', 'EEM', 'EEN', 'EFD', 'EFK', 'EGE', 'EGX', 'EKM',
  'EKO', 'ELD', 'ELM', 'ELO', 'ELP', 'ELV', 'ELY', 'EMK', 'ENA', 'END', 'ENV', 'ENW',
  'EPH', 'ERI', 'ESC', 'ESD', 'ESF', 'ESN', 'EUG', 'EVV', 'EWB', 'EWN', 'EWR', 'EXI',
  'EYW', 'FAI', 'FAR', 'FAT', 'FAY', 'FBS', 'FCA', 'FDK', 'FDY', 'FFA', 'FIT', 'FKL',
  'FLD', 'FLG', 'FLL', 'FLO', 'FMN', 'FMY', 'FNL', 'FNT', 'FOD', 'FOE', 'FRD', 'FRG',
  'FRM', 'FSD', 'FSM', 'FTW', 'FTY', 'FUL', 'FWA', 'FXE', 'GAD', 'GAG', 'GAI', 'GAL',
  'GAM', 'GCC', 'GCK', 'GCN', 'GDV', 'GED', 'GEG', 'GFK', 'GFL', 'GGG', 'GGW', 'GJT',
  'GLH', 'GLS', 'GLV', 'GMU', 'GNU', 'GNV', 'GON', 'GPI', 'GPT', 'GPZ', 'GRB', 'GRF',
  'GRI', 'GRK', 'GRR', 'GSO', 'GSP', 'GST', 'GTF', 'GTR', 'GUC', 'GUP', 'GWO', 'GYY',
  'HBG', 'HBR', 'HCR', 'HDN', 'HEF', 'HFD', 'HGR', 'HHH', 'HHR', 'HIB', 'HIF', 'HIO',
  'HKY', 'HLN', 'HNH', 'HNL', 'HNM', 'HNS', 'HOB', 'HOM', 'HON', 'HOT', 'HOU', 'HPB',
  'HPN', 'HQM', 'HRL', 'HRO', 'HSH', 'HSI', 'HSL', 'HSP', 'HST', 'HSV', 'HTS', 'HUF',
  'HUM', 'HUS', 'HVN', 'HVR', 'HXD', 'HYA', 'HYG', 'HYS', 'HZL', 'IAD', 'IAG', 'IAH',
  'IAN', 'ICT', 'IDA', 'IFP', 'IGG', 'IGM', 'IKO', 'ILE', 'ILG', 'ILI', 'ILM', 'IMT',
  'IND', 'INL', 'INT', 'IOW', 'IPL', 'IPT', 'IRC', 'IRK', 'ISM', 'ISN', 'ISO', 'ISP',
  'ITH', 'ITO', 'IWA', 'IWD', 'IYK', 'JAC', 'JAN', 'JAX', 'JBR', 'JEF', 'JFK', 'JHM',
  'JHW', 'JLN', 'JMS', 'JNU', 'JST', 'JVL', 'JWN', 'JXN', 'JYO', 'KAE', 'KAL', 'KBC',
  'KCC', 'KCG', 'KCL', 'KCQ', 'KEB', 'KEH', 'KFP', 'KGK', 'KGX', 'KKA', 'KKB', 'KKH',
  'KKI', 'KKU', 'KLG', 'KLL', 'KLN', 'KLW', 'KMO', 'KMY', 'KNK', 'KNW', 'KOA', 'KOT',
  'KOY', 'KPB', 'KPC', 'KPN', 'KPR', 'KPV', 'KPY', 'KQA', 'KSM', 'KTB', 'KTN', 'KTS',
  'KUK', 'KVC', 'KVL', 'KWK', 'KWN', 'KWP', 'KWT', 'KXA', 'KYK', 'KYU', 'KZB', 'LAA',
  'LAF', 'LAL', 'LAN', 'LAR', 'LAS', 'LAW', 'LAX', 'LBB', 'LBE', 'LBF', 'LBL', 'LCH',
  'LCI', 'LCK', 'LDM', 'LEB', 'LEE', 'LEW', 'LEX', 'LFK', 'LFT', 'LGA', 'LGB', 'LGU',
  'LHX', 'LIH', 'LIT', 'LKE', 'LKV', 'LMA', 'LMT', 'LNK', 'LNS', 'LNY', 'LOU', 'LPS',
  'LRD', 'LRU', 'LSE', 'LSV', 'LTS', 'LUK', 'LUP', 'LUR', 'LVS', 'LWB', 'LWM', 'LWS',
  'LWT', 'LYH', 'MAF', 'MBG', 'MBL', 'MBS', 'MCD', 'MCE', 'MCG', 'MCI', 'MCK', 'MCN',
  'MCO', 'MCW', 'MDH', 'MDO', 'MDT', 'MDW', 'MEI', 'MEM', 'MEU', 'MFD', 'MFE', 'MFR',
  'MGJ', 'MGM', 'MGW', 'MGY', 'MHK', 'MHR', 'MHT', 'MIA', 'MIE', 'MIV', 'MKC', 'MKE',
  'MKG', 'MKK', 'MKL', 'MKT', 'MLB', 'MLC', 'MLI', 'MLL', 'MLS', 'MLU', 'MLY', 'MMH',
  'MMU', 'MNZ', 'MOA', 'MOB', 'MOD', 'MOT', 'MOU', 'MPB', 'MPV', 'MQI', 'MQT', 'MQY',
  'MRB', 'MRH', 'MRI', 'MRY', 'MSL', 'MSN', 'MSO', 'MSP', 'MSS', 'MSY', 'MTH', 'MTJ',
  'MTM', 'MTN', 'MTV', 'MTW', 'MUE', 'MVL', 'MVY', 'MWA', 'MWH', 'MWL', 'MYF', 'MYL',
  'MYR', 'MYU', 'NCN', 'NEL', 'NEW', 'NGU', 'NHK', 'NIB', 'NLG', 'NME', 'NMM', 'NNK',
  'NNL', 'NPT', 'NQA', 'NUI', 'NUL', 'NUP', 'NYC', 'NYL', 'OAJ', 'OAK', 'OBU', 'OCF',
  'ODO', 'ODW', 'OFK', 'OGD', 'OGG', 'OGS', 'OKC', 'OLF', 'OLH', 'OLM', 'OMA', 'OME',
  'ONL', 'ONP', 'ONT', 'ONX', 'OOK', 'OPF', 'OQU', 'ORD', 'ORE', 'ORF', 'ORH', 'ORL',
  'ORV', 'OSC', 'OSH', 'OSU', 'OTH', 'OTM', 'OTS', 'OTZ', 'OWB', 'OWD', 'OXB', 'OXC',
  'OXR', 'PAE', 'PAH', 'PBF', 'PBG', 'PBI', 'PBV', 'PDK', 'PDT', 'PDX', 'PEC', 'PGA',
  'PGD', 'PGM', 'PGV', 'PHF', 'PHL', 'PHO', 'PHP', 'PHX', 'PIA', 'PIB', 'PIE', 'PIH',
  'PIP', 'PIR', 'PIT', 'PIZ', 'PKB', 'PLN', 'PMD', 'PML', 'PNC', 'PNE', 'PNS', 'POE',
  'POU', 'PPV', 'PQI', 'PQS', 'PRC', 'PSC', 'PSG', 'PSM', 'PSP', 'PSX', 'PTD', 'PTH',
  'PTK', 'PTU', 'PUB', 'PUW', 'PVC', 'PVD', 'PVU', 'PWK', 'PWM', 'RAC', 'RAP', 'RBD',
  'RBY', 'RCE', 'RDD', 'RDG', 'RDM', 'RDU', 'RDV', 'RFD', 'RHI', 'RIC', 'RIL', 'RIV',
  'RIW', 'RKD', 'RKS', 'RMG', 'RMP', 'RNO', 'RNT', 'ROA', 'ROC', 'ROW', 'RSH', 'RST',
  'RSU', 'RSW', 'RUT', 'RWI', 'SAD', 'SAF', 'SAN', 'SAT', 'SAV', 'SBA', 'SBD', 'SBM',
  'SBN', 'SBP', 'SBS', 'SBY', 'SCC', 'SCE', 'SCF', 'SCH', 'SCK', 'SCM', 'SDF', 'SDL',
  'SDM', 'SDP', 'SDY', 'SEA', 'SEE', 'SFB', 'SFO', 'SFZ', 'SGF', 'SGJ', 'SGU', 'SGY',
  'SHD', 'SHG', 'SHH', 'SHN', 'SHR', 'SHV', 'SHX', 'SIT', 'SJC', 'SJT', 'SKA', 'SKK',
  'SLC', 'SLE', 'SLH', 'SLK', 'SLN', 'SLQ', 'SMF', 'SMK', 'SMX', 'SNA', 'SNP', 'SNY',
  'SOP', 'SOV', 'SOW', 'SPI', 'SPS', 'SRQ', 'SRV', 'SSC', 'SSI', 'STC', 'STJ', 'STL',
  'STP', 'STS', 'SUA', 'SUN', 'SUS', 'SUW', 'SUX', 'SVA', 'SVC', 'SVS', 'SWF', 'SWO',
  'SXQ', 'SYB', 'SYR', 'TAL', 'TBN', 'TCC', 'TCL', 'TCS', 'TCT', 'TEB', 'TEX', 'TIK',
  'TIW', 'TKE', 'TKI', 'TLH', 'TLJ', 'TMB', 'TNC', 'TNK', 'TOG', 'TOL', 'TOP', 'TPA',
  'TPH', 'TPL', 'TRI', 'TRM', 'TTD', 'TTN', 'TUL', 'TUP', 'TUS', 'TVC', 'TVF', 'TVL',
  'TWE', 'TWF', 'TXK', 'TYE', 'TYR', 'TYS', 'UCA', 'UDD', 'UIN', 'UKI', 'UNK', 'UNV',
  'UOX', 'USA', 'UST', 'VAK', 'VCT', 'VCV', 'VDZ', 'VEE', 'VEL', 'VGT', 'VIS', 'VJI',
  'VLD', 'VNY', 'VPS', 'VPZ', 'VRB', 'VSF', 'WAA', 'WAH', 'WBQ', 'WBW', 'WDR', 'WHD',
  'WJF', 'WMO', 'WRG', 'WRL', 'WSN', 'WST', 'WTK', 'WTL', 'WVL', 'WWD', 'WWR', 'WWT',
  'WYS', 'XNA', 'XWA', 'YAK', 'YIP', 'YKM', 'YKN', 'YNG', 'YUM', 'ZNC', 'ZZV',
  // US Territories (Puerto Rico, U.S. Virgin Islands & American Samoa)
  'ARE', 'BQN', 'CPX', 'FAJ', 'FTI', 'HUC', 'MAZ', 'NRR', 'OFU', 'PPG', 'PSE', 'RVR',
  'SIG', 'SJU', 'SPB', 'SSB', 'STT', 'STX', 'TAV', 'VQS',
  // Canada (Provinces & Territories)
  'AKV', 'CXH', 'DAS', 'DUQ', 'FBD', 'FOY', 'GOC', 'HBH', 'JHL', 'JHM', 'KIF', 'LAK',
  'LHP', 'LLU', 'LTM', 'LWK', 'MET', 'MSA', 'NWP', 'PIW', 'SUR', 'TUX', 'WNN', 'XBE',
  'XGR', 'XKS', 'XLB', 'XPK', 'XQU', 'XRR', 'XSI', 'XTL', 'YAA', 'YAB', 'YAC', 'YAG',
  'YAH', 'YAI', 'YAL', 'YAM', 'YAQ', 'YAR', 'YAS', 'YAT', 'YAV', 'YAX', 'YAY', 'YAZ',
  'YBA', 'YBB', 'YBC', 'YBD', 'YBE', 'YBF', 'YBG', 'YBJ', 'YBK', 'YBL', 'YBM', 'YBN',
  'YBO', 'YBQ', 'YBR', 'YBT', 'YBU', 'YBV', 'YBW', 'YBX', 'YCA', 'YCB', 'YCC', 'YCD',
  'YCE', 'YCG', 'YCJ', 'YCL', 'YCM', 'YCN', 'YCO', 'YCP', 'YCQ', 'YCR', 'YCS', 'YCT',
  'YCW', 'YCY', 'YDA', 'YDB', 'YDC', 'YDF', 'YDG', 'YDI', 'YDL', 'YDN', 'YDO', 'YDP',
  'YDQ', 'YDT', 'YDV', 'YDX', 'YEA', 'YED', 'YEG', 'YEK', 'YEL', 'YEN', 'YER', 'YET',
  'YEU', 'YEV', 'YEY', 'YFA', 'YFB', 'YFC', 'YFD', 'YFE', 'YFG', 'YFH', 'YFI', 'YFM',
  'YFO', 'YFR', 'YFS', 'YFT', 'YGA', 'YGD', 'YGE', 'YGG', 'YGH', 'YGK', 'YGL', 'YGM',
  'YGO', 'YGP', 'YGQ', 'YGR', 'YGT', 'YGV', 'YGW', 'YGX', 'YHA', 'YHB', 'YHD', 'YHE',
  'YHF', 'YHG', 'YHH', 'YHI', 'YHK', 'YHM', 'YHN', 'YHO', 'YHP', 'YHR', 'YHS', 'YHU',
  'YHY', 'YHZ', 'YIB', 'YIF', 'YIK', 'YIO', 'YIV', 'YJA', 'YJP', 'YJT', 'YKA', 'YKF',
  'YKG', 'YKJ', 'YKK', 'YKL', 'YKP', 'YKQ', 'YKT', 'YKU', 'YKX', 'YKY', 'YLA', 'YLB',
  'YLC', 'YLD', 'YLE', 'YLH', 'YLJ', 'YLL', 'YLQ', 'YLR', 'YLS', 'YLT', 'YLW', 'YMA',
  'YMB', 'YME', 'YMF', 'YMG', 'YMJ', 'YML', 'YMM', 'YMN', 'YMO', 'YMP', 'YMS', 'YMT',
  'YMX', 'YMY', 'YNA', 'YNC', 'YND', 'YNE', 'YNH', 'YNL', 'YNM', 'YNO', 'YNS', 'YNY',
  'YOA', 'YOC', 'YOD', 'YOG', 'YOH', 'YOJ', 'YOO', 'YOP', 'YOS', 'YOW', 'YOY', 'YPA',
  'YPB', 'YPC', 'YPD', 'YPE', 'YPF', 'YPH', 'YPI', 'YPJ', 'YPK', 'YPL', 'YPM', 'YPN',
  'YPO', 'YPP', 'YPQ', 'YPR', 'YPS', 'YPT', 'YPW', 'YPX', 'YPY', 'YQA', 'YQB', 'YQC',
  'YQD', 'YQF', 'YQG', 'YQI', 'YQK', 'YQM', 'YQN', 'YQQ', 'YQR', 'YQS', 'YQT', 'YQU',
  'YQV', 'YQW', 'YQX', 'YQY', 'YQZ', 'YRA', 'YRC', 'YRD', 'YRE', 'YRF', 'YRG', 'YRI',
  'YRJ', 'YRL', 'YRM', 'YRN', 'YRO', 'YRQ', 'YRR', 'YRS', 'YRT', 'YRV', 'YSA', 'YSB',
  'YSC', 'YSE', 'YSF', 'YSG', 'YSJ', 'YSK', 'YSL', 'YSM', 'YSN', 'YSO', 'YSP', 'YSQ',
  'YSR', 'YSS', 'YST', 'YSU', 'YSV', 'YSW', 'YSX', 'YSY', 'YTA', 'YTB', 'YTC', 'YTD',
  'YTE', 'YTF', 'YTG', 'YTH', 'YTI', 'YTJ', 'YTK', 'YTL', 'YTO', 'YTP', 'YTQ', 'YTR',
  'YTS', 'YTT', 'YTU', 'YTV', 'YTW', 'YTX', 'YTZ', 'YUB', 'YUD', 'YUL', 'YUT', 'YUX',
  'YUY', 'YVA', 'YVB', 'YVC', 'YVG', 'YVM', 'YVO', 'YVP', 'YVQ', 'YVR', 'YVT', 'YVV',
  'YWA', 'YWB', 'YWF', 'YWG', 'YWH', 'YWJ', 'YWK', 'YWL', 'YWM', 'YWN', 'YWP', 'YWS',
  'YWV', 'YXC', 'YXD', 'YXE', 'YXH', 'YXJ', 'YXK', 'YXL', 'YXP', 'YXS', 'YXT', 'YXU',
  'YXX', 'YXY', 'YXZ', 'YYB', 'YYC', 'YYD', 'YYE', 'YYF', 'YYG', 'YYH', 'YYJ', 'YYL',
  'YYN', 'YYQ', 'YYR', 'YYT', 'YYU', 'YYW', 'YYY', 'YYZ', 'YZD', 'YZE', 'YZF', 'YZG',
  'YZH', 'YZP', 'YZR', 'YZS', 'YZT', 'YZU', 'YZV', 'YZZ', 'ZAC', 'ZBF', 'ZBM', 'ZEE',
  'ZEM', 'ZFA', 'ZFD', 'ZFM', 'ZFN', 'ZGI', 'ZGR', 'ZGS', 'ZHP', 'ZJG', 'ZJN', 'ZKE',
  'ZKG', 'ZLT', 'ZMT', 'ZNA', 'ZNG', 'ZNU', 'ZOF', 'ZPB', 'ZPO', 'ZRJ', 'ZSA', 'ZSJ',
  'ZST', 'ZSW', 'ZTA', 'ZTB', 'ZTM', 'ZTS', 'ZUC', 'ZUM', 'ZWH', 'ZWL',
]);

function normalizeAirportList(input: string | string[]): string[] {
  const list = Array.isArray(input) ? input : [input];
  return list
    .map((code) => code.trim().toUpperCase())
    .filter((code) => code.length === 3);
}

/**
 * Returns true when all origin and destination airports are within the United States,
 * US territories, or Canada, where Google Flights natively enforces "Economy (exclude Basic)".
 */
export function supportsBasicEconomyExclusion(
  origin: string | string[],
  destination: string | string[]
): boolean {
  const origins = normalizeAirportList(origin);
  const destinations = normalizeAirportList(destination);
  if (origins.length === 0 || destinations.length === 0) {
    return false;
  }

  return (
    origins.every((code) => US_AND_CANADA_IATA_CODES.has(code)) &&
    destinations.every((code) => US_AND_CANADA_IATA_CODES.has(code))
  );
}