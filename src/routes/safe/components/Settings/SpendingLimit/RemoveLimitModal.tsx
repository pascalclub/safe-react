import { Button } from '@gnosis.pm/safe-react-components'
import React, { ReactElement, useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import Block from 'src/components/layout/Block'
import Col from 'src/components/layout/Col'
import useTokenInfo from 'src/logic/safe/hooks/useTokenInfo'
import createTransaction from 'src/logic/safe/store/actions/createTransaction'
import { safeParamAddressFromStateSelector } from 'src/logic/safe/store/selectors'
import { TX_NOTIFICATION_TYPES } from 'src/logic/safe/transactions'
import { getDeleteAllowanceTxData } from 'src/logic/safe/utils/spendingLimits'
import { fromTokenUnit } from 'src/logic/tokens/utils/humanReadableValue'
import { SPENDING_LIMIT_MODULE_ADDRESS } from 'src/utils/constants'

import { RESET_TIME_OPTIONS } from './FormFields/ResetTime'
import { AddressInfo, ResetTimeInfo, TokenInfo } from './InfoDisplay'
import { SpendingLimitTable } from './LimitsTable/dataFetcher'
import Modal from './Modal'
import { useStyles } from './style'
import { EstimationStatus, useEstimateTransactionGas } from 'src/logic/hooks/useEstimateTransactionGas'
import { EditableTxParameters } from 'src/routes/safe/components/Transactions/helpers/EditableTxParameters'
import { TxParameters } from 'src/routes/safe/container/hooks/useTransactionParameters'
import { TxParametersDetail } from 'src/routes/safe/components/Transactions/helpers/TxParametersDetail'
import Row from 'src/components/layout/Row'
import { TransactionFees } from 'src/components/TransactionsFees'

interface RemoveSpendingLimitModalProps {
  onClose: () => void
  spendingLimit: SpendingLimitTable
  open: boolean
}

export const RemoveLimitModal = ({ onClose, spendingLimit, open }: RemoveSpendingLimitModalProps): ReactElement => {
  const classes = useStyles()

  const tokenInfo = useTokenInfo(spendingLimit.spent.tokenAddress)

  const safeAddress = useSelector(safeParamAddressFromStateSelector)
  const [txData, setTxData] = useState('')
  const dispatch = useDispatch()

  useEffect(() => {
    const {
      beneficiary,
      spent: { tokenAddress },
    } = spendingLimit
    const txData = getDeleteAllowanceTxData({ beneficiary, tokenAddress })
    setTxData(txData)
  }, [spendingLimit])

  const {
    gasCostFormatted,
    txEstimationExecutionStatus,
    isExecution,
    isOffChainSignature,
    isCreation,
    gasLimit,
    gasEstimation,
    gasPriceFormatted,
  } = useEstimateTransactionGas({
    txData,
    txRecipient: SPENDING_LIMIT_MODULE_ADDRESS,
    txAmount: '0',
  })

  const removeSelectedSpendingLimit = async (txParameters: TxParameters): Promise<void> => {
    try {
      dispatch(
        createTransaction({
          safeAddress,
          to: SPENDING_LIMIT_MODULE_ADDRESS,
          valueInWei: '0',
          txData,
          txNonce: txParameters.safeNonce,
          safeTxGas: txParameters.safeTxGas ? Number(txParameters.safeTxGas) : undefined,
          ethParameters: txParameters,
          notifiedTransaction: TX_NOTIFICATION_TYPES.REMOVE_SPENDING_LIMIT_TX,
        }),
      )
    } catch (e) {
      console.error(
        `failed to remove spending limit ${spendingLimit.beneficiary} -> ${spendingLimit.spent.tokenAddress}`,
        e.message,
      )
    }
  }

  const resetTimeLabel =
    RESET_TIME_OPTIONS.find(({ value }) => +value === +spendingLimit.resetTime.resetTimeMin / 24 / 60)?.label ?? ''

  return (
    <Modal
      handleClose={onClose}
      open={open}
      title="Remove Spending Limit"
      description="Remove the selected Spending Limit"
    >
      <EditableTxParameters ethGasLimit={gasLimit} ethGasPrice={gasPriceFormatted} safeTxGas={gasEstimation.toString()}>
        {(txParameters, toggleEditMode) => {
          return (
            <>
              <Modal.TopBar title="Remove Spending Limit" onClose={onClose} />

              <Block className={classes.container}>
                <Col margin="lg">
                  <AddressInfo title="Beneficiary" address={spendingLimit.beneficiary} />
                </Col>
                <Col margin="lg">
                  {tokenInfo && (
                    <TokenInfo
                      amount={fromTokenUnit(spendingLimit.spent.amount, tokenInfo.decimals)}
                      title="Amount"
                      token={tokenInfo}
                    />
                  )}
                </Col>
                <Col margin="lg">
                  <ResetTimeInfo title="Reset Time" label={resetTimeLabel} />
                </Col>
              </Block>

              {/* Tx Parameters */}
              <TxParametersDetail
                txParameters={txParameters}
                onEdit={toggleEditMode}
                compact={false}
                isTransactionCreation={isCreation}
                isTransactionExecution={isExecution}
              />
              <Row className={classes.modalDescription}>
                <TransactionFees
                  gasCostFormatted={gasCostFormatted}
                  isExecution={isExecution}
                  isCreation={isCreation}
                  isOffChainSignature={isOffChainSignature}
                  txEstimationExecutionStatus={txEstimationExecutionStatus}
                />
              </Row>

              <Modal.Footer>
                <Button size="md" color="secondary" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  color="error"
                  size="md"
                  variant="contained"
                  onClick={() => removeSelectedSpendingLimit(txParameters)}
                  disabled={txEstimationExecutionStatus === EstimationStatus.LOADING}
                >
                  Remove
                </Button>
              </Modal.Footer>
            </>
          )
        }}
      </EditableTxParameters>
    </Modal>
  )
}
