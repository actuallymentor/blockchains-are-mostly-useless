import chai from 'chai'
import aspromised from 'chai-as-promised'
import subset from 'chai-subset'

chai.use( subset )
chai.use( aspromised )

chai.should()

export default chai.expect