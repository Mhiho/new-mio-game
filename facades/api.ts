import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { err, ok } from 'neverthrow';
import { handleFacadeResponseError } from '../errors/handleFacadeError';

const apiGeneric = async <ResponseData, SentData = any>({
  axiosInstance = axios,
  httpMethod,
  url,
  config,

  data,
}: {
  axiosInstance?: AxiosInstance;
  httpMethod: 'get' | 'delete' | 'post' | 'put' | 'patch';
  url: string;
  config?: AxiosRequestConfig;
  data?: SentData;
}) => {
  try {
    const res = await axiosInstance[httpMethod]<ResponseData>(
      url,
      data ? data : config,
      config,
    );
    return ok(res.data);
  } catch (e) {
    return err(handleFacadeResponseError(e));
  }
};

export const api = (axiosInstance: AxiosInstance = axios) => {
  return {
    get: async <ResponseData>(url: string, config?: AxiosRequestConfig) =>
      await apiGeneric<ResponseData>({
        axiosInstance,
        url,
        httpMethod: 'get',
        config,
      }),
    delete: async <ResponseData>(url: string, config?: AxiosRequestConfig) =>
      await apiGeneric<ResponseData>({
        axiosInstance,
        url,
        httpMethod: 'delete',
        config,
      }),
    post: async <ResponseData, SentData = any>(
      url: string,
      data: SentData,
      config?: AxiosRequestConfig,
    ) =>
      await apiGeneric<ResponseData, SentData>({
        axiosInstance,
        url,
        httpMethod: 'post',
        data,
        config,
      }),
    patch: async <ResponseData, SentData = any>(
      url: string,
      data: SentData,
      config?: AxiosRequestConfig,
    ) =>
      await apiGeneric<ResponseData, SentData>({
        axiosInstance,
        url,
        httpMethod: 'patch',
        data,
        config,
      }),
    put: async <ResponseData, SentData = any>(
      url: string,
      data: SentData,
      config?: AxiosRequestConfig,
    ) =>
      await apiGeneric<ResponseData, SentData>({
        axiosInstance,
        url,
        httpMethod: 'put',
        data,
        config,
      }),
  };
};
