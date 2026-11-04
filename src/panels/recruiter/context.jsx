import { createContext, useContext } from 'react';

export const CompanyContext = createContext({ company: null, loading: true, reload: () => {} });
export const useCompany = () => useContext(CompanyContext);
