import { useCallback, useEffect, useRef, useState } from 'react';
import { decodeEventLog, type Hex } from 'viem';
import { CORE_ADDRESS, RPC_URL, coreContractAbi } from '../lib/chain';

export type ContractEvent =
  | { type: 'SchoolRegistered'; schoolAddress: string; schoolName: string; adminEmail: string; timestamp: bigint }
  | { type: 'CodeGenerated'; code: string; schoolAddress: string; period: bigint; gracePeriod: bigint; expiresAt: bigint; timestamp: bigint }
  | { type: 'LicenseActivated'; code: string; schoolAddress: string; period: bigint; gracePeriod: bigint; expiresAt: bigint; activatedAt: bigint }
  | { type: 'CodeDeactivated'; code: string; schoolAddress: string; timestamp: bigint };

export interface UseContractEventsOptions {
  onSchoolRegistered?: (data: ContractEvent) => void;
  onCodeGenerated?: (data: ContractEvent) => void;
  onLicenseActivated?: (data: ContractEvent) => void;
  onCodeDeactivated?: (data: ContractEvent) => void;
}

export function useContractEvents(options: UseContractEventsOptions = {}) {
  const { onSchoolRegistered, onCodeGenerated, onLicenseActivated, onCodeDeactivated } = options;
  const wsRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cbRef = useRef({ onSchoolRegistered, onCodeGenerated, onLicenseActivated, onCodeDeactivated });
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    cbRef.current = { onSchoolRegistered, onCodeGenerated, onLicenseActivated, onCodeDeactivated };
  }, [onSchoolRegistered, onCodeGenerated, onLicenseActivated, onCodeDeactivated]);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    try {
      const ws = new WebSocket(RPC_URL.replace('https://', 'wss://'));
      wsRef.current = ws;
      ws.onopen = () => { 
        setIsConnected(true); 
        setError(null); 
        console.log('[WS] Connected');
        
        // Subscribe to all logs from the contract
        ws.send(JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_subscribe',
          params: ['logs', { address: CORE_ADDRESS, topics: [] }]
        }));
      };
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          
          // Skip subscription confirmation messages
          if (msg.id && msg.result) {
            return;
          }
          
          const log = msg.params?.result;
          if (log && log.address?.toLowerCase() === CORE_ADDRESS.toLowerCase()) {
            const decoded = decodeContractEvent(log);
            if (decoded) {
              const cbs = cbRef.current;
              switch (decoded.type) {
                case 'SchoolRegistered': cbs.onSchoolRegistered?.(decoded); break;
                case 'CodeGenerated': cbs.onCodeGenerated?.(decoded); break;
                case 'LicenseActivated': cbs.onLicenseActivated?.(decoded); break;
                case 'CodeDeactivated': cbs.onCodeDeactivated?.(decoded); break;
              }
            }
          }
        } catch {}
      };
      ws.onclose = () => {
        setIsConnected(false);
        wsRef.current = null;
        if (!timerRef.current) timerRef.current = setTimeout(connect, 3000);
      };
      ws.onerror = () => setError('Connection error');
    } catch (e) { setError((e as Error)?.message); }
  }, []);

  const disconnect = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    wsRef.current?.close();
    wsRef.current = null;
    setIsConnected(false);
  }, []);

  useEffect(() => { connect(); return disconnect; }, [connect, disconnect]);

  return { isConnected, error, reconnect: connect, disconnect };
}

function decodeContractEvent(log: { topics: Hex[]; data: Hex; address: string }): ContractEvent | null {
  try {
    const eventAbi = coreContractAbi as Array<{ type: 'event'; name: string; inputs: Array<{ indexed: boolean; name: string; type: string }> }>;
    const events = eventAbi.filter(e => e.type === 'event') as Array<{ name: string; inputs: Array<{ indexed: boolean; name: string; type: string }> }>;
    
    for (const ev of events) {
      try {
        const eventOnlyAbi = [{ ...ev, anonymous: false, type: 'event' }];
        const mockLog = { topics: log.topics, data: log.data, address: log.address } as Parameters<typeof decodeEventLog>[0]['log'];
        const decoded = decodeEventLog({ abi: eventOnlyAbi, log: mockLog });
        
        if (decoded.name === ev.name) {
          const args = decoded.args as Record<string, unknown>;
          
          if (ev.name === 'SchoolRegistered') {
            return {
              type: 'SchoolRegistered',
              schoolAddress: args.schoolAddress as string,
              schoolName: args.schoolName as string,
              adminEmail: args.adminEmail as string,
              timestamp: args.timestamp as bigint
            };
          }
          if (ev.name === 'CodeGenerated') {
            return {
              type: 'CodeGenerated',
              code: args.code as string,
              schoolAddress: args.schoolAddress as string,
              period: args.period as bigint,
              gracePeriod: args.gracePeriod as bigint,
              expiresAt: args.codeExpiresAt as bigint,
              timestamp: args.timestamp as bigint
            };
          }
          if (ev.name === 'LicenseActivated') {
            return {
              type: 'LicenseActivated',
              code: args.code as string,
              schoolAddress: args.schoolAddress as string,
              period: args.period as bigint,
              gracePeriod: args.gracePeriod as bigint,
              expiresAt: args.expiresAt as bigint,
              activatedAt: args.activatedAt as bigint
            };
          }
          if (ev.name === 'CodeDeactivated') {
            return {
              type: 'CodeDeactivated',
              code: args.code as string,
              schoolAddress: args.schoolAddress as string,
              timestamp: args.timestamp as bigint
            };
          }
        }
      } catch {}
    }
  } catch {}
  return null;
}