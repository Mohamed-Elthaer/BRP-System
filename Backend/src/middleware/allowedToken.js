import AppError from "../utils/AppError.js"
import httpStatusText from "../utils/httpStatusText.js"

export default (...role)=>{
    return (req,res,next)=>{
        if(!role.includes(req.currentUser.role)){
                return next(AppError.create('this role is not authorized',401,httpStatusText.FAIL))
            }
            next()
    }
}