import { userSerializer } from "#src/models/User.js"
import * as authService from "#src/services/authService.js"
import { setRefreshCookie } from "#src/utils/tokenUtils.js"

export const signup = async (req, res) => {
  const { email, password, username } = req.body
  const { user } = await authService.signup({ email, password, username })

  res.status(201).json({
    data: { user: userSerializer(user) },
    status: "success"
  })
}

export const verifyEmail = async (req, res) => {
  const { token } = req.body
  const { accessToken, refreshToken, user } = await authService.verifyEmail(token)

  setRefreshCookie(res, refreshToken)

  res.status(200).json({
    data: { accessToken, user: userSerializer(user) },
    status: "success"
  })
}

export const resendVerificationEmail = async (req, res) => {
  const { email } = req.body
  await authService.resendVerificationEmail(email)

  res.status(200).json({
    data: null,
    status: "success"
  })
}

export const login = async (req, res) => {
  const { password, username } = req.body
  const { accessToken, refreshToken, user } = await authService.login({ password, username })

  setRefreshCookie(res, refreshToken)

  res.status(200).json({
    data: { accessToken, user: userSerializer(user) },
    status: "success"
  })
}

export const logout = async (req, res) => {
  const { refreshToken } = req.cookies
  await authService.logout(refreshToken)

  res.clearCookie("refreshToken")

  res.status(200).json({
    data: null,
    status: "success"
  })
}

export const refresh = async (req, res) => {
  const { refreshToken } = req.cookies
  const accessToken = await authService.refresh(refreshToken)

  res.status(200).json({
    data: { accessToken },
    status: "success"
  })
}
